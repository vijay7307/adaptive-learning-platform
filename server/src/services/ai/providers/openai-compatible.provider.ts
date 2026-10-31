import { config } from '../../../config/env'
import {
  AiProviderError,
  type AiGenerationRequest,
  type AiProvider,
  type AiProviderName,
  type AiProviderResponse,
} from '../contracts'
import { curriculumJsonInstruction } from '../curriculum.prompt'

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>
  usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout'))
}

function statusFromError(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

function getContentText(content: unknown): string | undefined {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return undefined
  const parts = content
    .filter(isRecord)
    .map((part) => part.text)
    .filter((text): text is string => typeof text === 'string')
  return parts.length > 0 ? parts.join('') : undefined
}

function classify(
  error: unknown,
  provider: AiProviderName,
  model: string,
): AiProviderError {
  const status = statusFromError(error)
  if (isTimeout(error)) return new AiProviderError('TIMEOUT', `${provider} request timed out.`, provider, model, status, { cause: error })
  if (status === 401 || status === 403) return new AiProviderError('INVALID_API_KEY', `${provider} credentials are invalid.`, provider, model, status)
  if (status === 429) return new AiProviderError('QUOTA_EXCEEDED', `${provider} quota is exhausted.`, provider, model, status)
  if (status !== undefined && status >= 400 && status < 500) {
    return new AiProviderError('INVALID_REQUEST', `${provider} rejected the request.`, provider, model, status)
  }
  return new AiProviderError('TEMPORARY_FAILURE', `${provider} is temporarily unavailable.`, provider, model, status, { cause: error })
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: AiProviderName
  readonly model: string
  private readonly apiKey: string
  private readonly endpoint: string
  private readonly extraHeaders: Record<string, string>

  constructor(
    name: 'groq' | 'openrouter',
    apiKey: string,
    model: string,
    endpoint: string,
    extraHeaders: Record<string, string> = {},
  ) {
    this.name = name
    this.apiKey = apiKey
    this.model = model
    this.endpoint = endpoint
    this.extraHeaders = extraHeaders
  }

  async generate(request: AiGenerationRequest): Promise<AiProviderResponse> {
    if (!this.apiKey) {
      throw new AiProviderError('NOT_CONFIGURED', `${this.name} is not configured.`, this.name, this.model)
    }
    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs)
    try {
      const requestBody: Record<string, unknown> = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: curriculumJsonInstruction,
          },
          { role: 'user', content: request.prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: request.maxOutputTokens,
      }
      if (this.model.startsWith('openai/gpt-oss')) {
        requestBody.reasoning_effort = 'low'
      }
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.extraHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      if (!response.ok) {
        const error = Object.assign(new Error('Provider request failed'), { status: response.status })
        throw classify(error, this.name, this.model)
      }
      const payload: unknown = await response.json()
      const data = isRecord(payload) ? (payload as ChatCompletionResponse) : {}
      const text = getContentText(data.choices?.[0]?.message?.content)
      if (!text?.trim()) {
        throw new AiProviderError('TEMPORARY_FAILURE', `${this.name} returned an empty response.`, this.name, this.model)
      }
      const usage = data.usage
      return {
        text: text.trim(),
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - startedAt,
        usage: usage
          ? {
              inputTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
              outputTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
              totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
            }
          : undefined,
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw classify(error, this.name, this.model)
    } finally {
      clearTimeout(timeout)
    }
  }
}
