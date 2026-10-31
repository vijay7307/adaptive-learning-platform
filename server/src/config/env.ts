import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Locate .env in server directory regardless of current working directory
const potentialEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
]

for (const envPath of potentialEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

export interface Config {
  port: number
  nodeEnv: string
  mongodbUri: string
  clientUrl: string
  jwtSecret: string
  jwtExpiresIn: string
  geminiApiKey: string
  geminiModel: string
  aiPrimaryProvider: 'groq' | 'openrouter' | 'gemini'
  aiFallbackProviders: Array<'groq' | 'openrouter' | 'gemini'>
  groqApiKey: string
  groqModel: string
  openRouterApiKey: string
  openRouterModel: string
  aiTimeoutMs: number
  aiMaxRetries: number
  aiMaxOutputTokens: number
  aiMaxPromptCharacters: number
  aiMaxProviderAttempts: number
}

const providerNames = ['groq', 'openrouter', 'gemini'] as const
type ProviderName = (typeof providerNames)[number]

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  clientUrl: process.env.CLIENT_URL?.trim() || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
  aiPrimaryProvider: parseProvider(process.env.AI_PRIMARY_PROVIDER),
  aiFallbackProviders: parseProviders(process.env.AI_FALLBACK_PROVIDERS),
  groqApiKey: process.env.GROQ_API_KEY?.trim() || '',
  groqModel: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
  openRouterApiKey: process.env.OPENROUTER_API_KEY?.trim() || '',
  openRouterModel: process.env.OPENROUTER_MODEL?.trim() || 'meta-llama/llama-3.3-70b-instruct',
  aiTimeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS || process.env.GEMINI_TIMEOUT_MS, 120_000),
  aiMaxRetries: parseNonNegativeInteger(process.env.AI_MAX_RETRIES || process.env.GEMINI_MAX_RETRIES, 2),
  aiMaxOutputTokens: parsePositiveInteger(process.env.AI_MAX_OUTPUT_TOKENS, 8_192),
  aiMaxPromptCharacters: parsePositiveInteger(process.env.AI_MAX_PROMPT_CHARACTERS, 20_000),
  aiMaxProviderAttempts: parsePositiveInteger(process.env.AI_MAX_PROVIDER_ATTEMPTS, 3),
}

function parseProvider(value: string | undefined): ProviderName {
  return providerNames.includes(value as ProviderName) ? (value as ProviderName) : 'groq'
}

function parseProviders(value: string | undefined): ProviderName[] {
  if (!value) return ['openrouter', 'gemini']
  return value
    .split(',')
    .map((provider) => provider.trim())
    .filter((provider): provider is ProviderName => providerNames.includes(provider as ProviderName))
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function validateAuthConfig(): void {
  if (!config.jwtSecret) {
    const errorMsg =
      'JWT_SECRET is not configured. Please set a secure JWT_SECRET in server/.env before using authentication services.'
    console.error(`[Config] ❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }
}
