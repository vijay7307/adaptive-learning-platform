import { GoogleGenAI, type GenerateContentResponse, type Schema } from '@google/genai'
import { config } from '../../../config/env'
import { AiProviderError, type AiGenerationRequest, type AiProvider, type AiProviderResponse } from '../contracts'
import { curriculumResponseSchema } from '../curriculum.schema'

export interface GenerativeModelClient {
  models: {
    generateContent(request: {
      model: string
      contents: string
      config: {
        responseMimeType: string
        responseSchema: Schema
        maxOutputTokens?: number
      }
    }): Promise<GenerateContentResponse>
  }
}

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as Record<string, unknown>
  return typeof record.status === 'number' ? record.status : undefined
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout'))
}

function classify(error: unknown, model: string): AiProviderError {
  const status = getStatus(error)
  if (isTimeout(error)) return new AiProviderError('TIMEOUT', 'Gemini request timed out.', 'gemini', model, status, { cause: error })
  if (status === 401 || status === 403) return new AiProviderError('INVALID_API_KEY', 'Gemini credentials are invalid.', 'gemini', model, status)
  if (status === 429) return new AiProviderError('QUOTA_EXCEEDED', 'Gemini quota is exhausted.', 'gemini', model, status)
  if (status !== undefined && status >= 400 && status < 500) {
    return new AiProviderError('INVALID_REQUEST', 'Gemini rejected the request.', 'gemini', model, status)
  }
  return new AiProviderError('TEMPORARY_FAILURE', 'Gemini is temporarily unavailable.', 'gemini', model, status, { cause: error })
}

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini' as const
  readonly model: string
  private readonly client: GenerativeModelClient

  constructor(client?: GenerativeModelClient) {
    this.model = config.geminiModel
    if (client) {
      this.client = client
    } else {
      if (!config.geminiApiKey) {
        throw new AiProviderError('NOT_CONFIGURED', 'Gemini is not configured.', this.name, this.model)
      }
      this.client = new GoogleGenAI({
        apiKey: config.geminiApiKey,
        httpOptions: { timeout: config.aiTimeoutMs, retryOptions: { attempts: 1 } },
      }) as unknown as GenerativeModelClient
    }
  }

  async generate(request: AiGenerationRequest): Promise<AiProviderResponse> {
    const startedAt = Date.now()
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: request.prompt,
        config: {
          responseMimeType: 'application/json',
        responseSchema: (request.responseSchema as Schema | undefined) || curriculumResponseSchema,
          maxOutputTokens: request.maxOutputTokens,
        },
      })
      const text = response.text?.trim()
      if (!text) {
        throw new AiProviderError('TEMPORARY_FAILURE', 'Gemini returned an empty response.', this.name, this.model)
      }
      const usage = response.usageMetadata
      return {
        text,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - startedAt,
        usage: usage
          ? {
              inputTokens: usage.promptTokenCount,
              outputTokens: usage.candidatesTokenCount,
              totalTokens: usage.totalTokenCount,
            }
          : undefined,
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw classify(error, this.model)
    }
  }
}
