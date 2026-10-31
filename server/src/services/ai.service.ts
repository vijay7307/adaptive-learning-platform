import { config } from '../config/env'
import {
  AiProviderError,
  AiServiceError,
  type AiProvider,
  type AiProviderName,
  type AiProviderResponse,
} from './ai/contracts'
import { validateGeneratedCurriculum } from './ai/curriculum.validation'
import type { GeneratedCurriculum } from './ai/curriculum.types'
import type { GeneratedLearningNote } from './ai/learning-notes.types'
import { validateGeneratedLearningNotes } from './ai/learning-notes.validation'
import { GeminiProvider, type GenerativeModelClient } from './ai/providers/gemini.provider'
import { OpenAiCompatibleProvider } from './ai/providers/openai-compatible.provider'

export { AiServiceError }
export { validateGeneratedCurriculum }
export type { GeneratedCurriculum }
export type { GenerativeModelClient }
export type { AiServiceErrorCode } from './ai/contracts'

export interface AiGenerationMetadata {
  provider: AiProviderName
  model: string
  latencyMs: number
  usage?: AiProviderResponse['usage']
  error?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseResponse(text: string): unknown {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(normalized)
  } catch (error) {
    const objectStart = normalized.indexOf('{')
    const objectEnd = normalized.lastIndexOf('}')
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(normalized.slice(objectStart, objectEnd + 1))
      } catch {
        // Preserve the classified validation error below without logging response contents.
      }
    }
    throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned malformed JSON.', { cause: error })
  }
}

function isRetryableWithinProvider(error: AiProviderError): boolean {
  return error.code === 'TIMEOUT' || error.code === 'TEMPORARY_FAILURE' || error.code === 'NETWORK_FAILURE'
}

function isFallbackEligible(error: AiProviderError): boolean {
  return (
    error.code === 'QUOTA_EXCEEDED' ||
    error.code === 'RATE_LIMITED' ||
    error.code === 'TIMEOUT' ||
    error.code === 'TEMPORARY_FAILURE' ||
    error.code === 'NETWORK_FAILURE'
  )
}

function toServiceError(error: AiProviderError): AiServiceError {
  switch (error.code) {
    case 'NOT_CONFIGURED':
      return new AiServiceError('AI_NOT_CONFIGURED', 'AI service is not configured.')
    case 'INVALID_API_KEY':
      return new AiServiceError('AI_INVALID_API_KEY', 'The AI service credentials are invalid.')
    case 'QUOTA_EXCEEDED':
    case 'RATE_LIMITED':
      return new AiServiceError('AI_QUOTA_EXCEEDED', 'The AI service quota is currently unavailable.')
    case 'TIMEOUT':
      return new AiServiceError('AI_TIMEOUT', 'The AI service timed out.', { cause: error })
    case 'INVALID_REQUEST':
      return new AiServiceError('AI_UNAVAILABLE', 'The AI service rejected the request.', { cause: error })
    case 'TEMPORARY_FAILURE':
    case 'NETWORK_FAILURE':
      return new AiServiceError('AI_UNAVAILABLE', 'The AI service is temporarily unavailable.', { cause: error })
  }
}

function createProvider(name: AiProviderName): AiProvider | undefined {
  switch (name) {
    case 'groq':
      return config.groqApiKey
        ? new OpenAiCompatibleProvider(
            'groq',
            config.groqApiKey,
            config.groqModel,
            'https://api.groq.com/openai/v1/chat/completions',
          )
        : undefined
    case 'openrouter':
      return config.openRouterApiKey
        ? new OpenAiCompatibleProvider(
            'openrouter',
            config.openRouterApiKey,
            config.openRouterModel,
            'https://openrouter.ai/api/v1/chat/completions',
            {
              'HTTP-Referer': config.clientUrl,
              'X-Title': 'Adaptive Learning Platform',
            },
          )
        : undefined
    case 'gemini':
      return config.geminiApiKey ? new GeminiProvider() : undefined
  }
}

function configuredProviderNames(): AiProviderName[] {
  return [config.aiPrimaryProvider, ...config.aiFallbackProviders].filter(
    (name, index, names) => names.indexOf(name) === index,
  )
}

export class AiService {
  private readonly providers: AiProvider[]
  private lastMetadata?: AiGenerationMetadata

  constructor(client?: GenerativeModelClient, providers?: AiProvider[]) {
    if (providers) {
      this.providers = providers
    } else if (client) {
      this.providers = [new GeminiProvider(client)]
    } else {
      this.providers = configuredProviderNames()
        .map(createProvider)
        .filter((provider): provider is AiProvider => provider !== undefined)
    }
  }

  getLastGenerationMetadata(): AiGenerationMetadata | undefined {
    return this.lastMetadata
  }

  async generateCurriculum(prompt: string): Promise<GeneratedCurriculum> {
    if (!isNonEmptyString(prompt)) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI prompt must not be empty.')
    }

    if (prompt.length > config.aiMaxPromptCharacters) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI prompt exceeds the configured request limit.')
    }
    if (this.providers.length === 0) {
      throw new AiServiceError('AI_NOT_CONFIGURED', 'AI service is not configured.')
    }

    let lastProviderError: AiProviderError | undefined
    let providerAttempts = 0
    for (const [providerIndex, provider] of this.providers.entries()) {
      if (providerAttempts >= config.aiMaxProviderAttempts) break
      let providerError: AiProviderError | undefined
      const remainingProviders = this.providers.length - providerIndex - 1
      const availableAttempts = config.aiMaxProviderAttempts - providerAttempts - remainingProviders
      const maxAttempts = Math.min(config.aiMaxRetries + 1, Math.max(1, availableAttempts))
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        providerAttempts += 1
        try {
          const response = await provider.generate({
            prompt,
            maxOutputTokens: config.aiMaxOutputTokens,
          })
          this.lastMetadata = {
            provider: response.provider,
            model: response.model,
            latencyMs: response.latencyMs,
            usage: response.usage,
          }
          return validateGeneratedCurriculum(parseResponse(response.text))
        } catch (error) {
          if (error instanceof AiServiceError) {
            console.warn(`[AI] ${provider.name} returned an invalid curriculum response`, {
              model: provider.model,
              code: error.code,
              message: error.message,
            })
            this.lastMetadata = {
              provider: provider.name,
              model: provider.model,
              latencyMs: 0,
              error: error.code,
            }
            throw error
          }
          if (!(error instanceof AiProviderError)) {
            throw new AiServiceError('AI_UNAVAILABLE', 'The AI service is temporarily unavailable.', { cause: error })
          }
          providerError = error
          lastProviderError = error
          this.lastMetadata = {
            provider: error.provider,
            model: error.model,
            latencyMs: 0,
            error: error.code,
          }
          console.warn(`[AI] ${error.provider} request failed`, {
            model: error.model,
            status: error.status,
            code: error.code,
          })
          if (!isRetryableWithinProvider(error) || attempt === maxAttempts - 1) break
          await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt))
        }
      }

      if (!providerError || !isFallbackEligible(providerError)) {
        throw toServiceError(providerError || new AiProviderError(
          'TEMPORARY_FAILURE',
          'The AI service is temporarily unavailable.',
          provider.name,
          provider.model,
        ))
      }
    }
    throw toServiceError(
      lastProviderError || new AiProviderError(
        'TEMPORARY_FAILURE',
        'The AI service is temporarily unavailable.',
        config.aiPrimaryProvider,
        'unknown',
      ),
    )
  }

  async generateLearningNotes(prompt: string): Promise<GeneratedLearningNote> {
    if (!isNonEmptyString(prompt) || prompt.length > config.aiMaxPromptCharacters) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI notes prompt is invalid.')
    }
    if (this.providers.length === 0) {
      throw new AiServiceError('AI_NOT_CONFIGURED', 'AI service is not configured.')
    }
    let lastProviderError: AiProviderError | undefined
    let providerAttempts = 0
    for (const [providerIndex, provider] of this.providers.entries()) {
      if (providerAttempts >= config.aiMaxProviderAttempts) break
      let providerError: AiProviderError | undefined
      const remainingProviders = this.providers.length - providerIndex - 1
      const availableAttempts = config.aiMaxProviderAttempts - providerAttempts - remainingProviders
      const maxAttempts = Math.min(config.aiMaxRetries + 1, Math.max(1, availableAttempts))
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        providerAttempts += 1
        try {
          const response = await provider.generate({ prompt, maxOutputTokens: config.aiMaxOutputTokens })
          this.lastMetadata = { provider: response.provider, model: response.model, latencyMs: response.latencyMs, usage: response.usage }
          return validateGeneratedLearningNotes(parseResponse(response.text))
        } catch (error) {
          if (error instanceof AiServiceError) throw error
          if (!(error instanceof AiProviderError)) {
            throw new AiServiceError('AI_UNAVAILABLE', 'The AI service is temporarily unavailable.', { cause: error })
          }
          providerError = error
          lastProviderError = error
          if (!isRetryableWithinProvider(error) || attempt === maxAttempts - 1) break
          await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt))
        }
      }
      if (!providerError || !isFallbackEligible(providerError)) {
        throw toServiceError(providerError || new AiProviderError('TEMPORARY_FAILURE', 'AI unavailable.', provider.name, provider.model))
      }
    }
    throw toServiceError(lastProviderError || new AiProviderError('TEMPORARY_FAILURE', 'AI unavailable.', config.aiPrimaryProvider, 'unknown'))
  }
}

let defaultService: AiService | undefined

function getDefaultService(): AiService {
  defaultService ??= new AiService()
  return defaultService
}

export const aiService = {
  generateCurriculum(prompt: string): Promise<GeneratedCurriculum> {
    return getDefaultService().generateCurriculum(prompt)
  },
  generateLearningNotes(prompt: string): Promise<GeneratedLearningNote> {
    return getDefaultService().generateLearningNotes(prompt)
  },
  getLastGenerationMetadata(): AiGenerationMetadata | undefined {
    return getDefaultService().getLastGenerationMetadata()
  },
}
