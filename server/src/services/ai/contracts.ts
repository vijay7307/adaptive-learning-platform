export type AiProviderName = 'groq' | 'openrouter' | 'gemini'

export type AiServiceErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_INVALID_API_KEY'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'

export class AiServiceError extends Error {
  constructor(
    public readonly code: AiServiceErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AiServiceError'
  }
}

export type AiProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'TEMPORARY_FAILURE'
  | 'INVALID_REQUEST'
  | 'NETWORK_FAILURE'

export interface AiGenerationRequest {
  prompt: string
  maxOutputTokens: number
  responseSchema?: unknown
}

export interface AiUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface AiProviderResponse {
  text: string
  provider: AiProviderName
  model: string
  latencyMs: number
  usage?: AiUsage
}

export interface AiProvider {
  readonly name: AiProviderName
  readonly model: string
  generate(request: AiGenerationRequest): Promise<AiProviderResponse>
}

export class AiProviderError extends Error {
  constructor(
    public readonly code: AiProviderErrorCode,
    message: string,
    public readonly provider: AiProviderName,
    public readonly model: string,
    public readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AiProviderError'
  }
}
