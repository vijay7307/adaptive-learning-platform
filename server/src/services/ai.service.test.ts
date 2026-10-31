import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AiService,
  AiServiceError,
  validateGeneratedCurriculum,
  type GeneratedCurriculum,
  type GenerativeModelClient,
} from './ai.service'
import { AiProviderError, type AiProvider } from './ai/contracts'
import { OpenAiCompatibleProvider } from './ai/providers/openai-compatible.provider'

const validCurriculum: GeneratedCurriculum = {
  goal: 'Learn TypeScript',
  subject: 'TypeScript',
  currentSkillLevel: 'beginner',
  availableStudyTimeMinutesPerDay: 60,
  targetDurationDays: 30,
  deadline: '2099-01-30T00:00:00.000Z',
  practiceActivities: ['Build a typed project'],
  revisionSessions: ['Review module notes each Sunday'],
  assessmentRecommendations: ['Take a weekly quiz'],
  modules: [
    {
      title: 'Foundations',
      order: 1,
      milestone: 'Use basic types confidently',
      completionCriteria: ['Complete a quiz'],
      topics: [
        {
          title: 'Types',
          order: 1,
          learningObjectives: ['Declare typed variables'],
          estimatedDurationMinutes: 60,
          completionCriteria: ['Write a typed function'],
        },
      ],
    },
  ],
  milestones: [
    {
      title: 'Foundation complete',
      description: 'Finish the introductory module',
      targetDate: '2099-01-15T00:00:00.000Z',
      completionCriteria: ['Pass the quiz'],
    },
  ],
}

test('validates a curriculum response', () => {
  assert.deepEqual(validateGeneratedCurriculum(validCurriculum), validCurriculum)
})

test('rejects malformed curriculum responses', () => {
  assert.throws(
    () => validateGeneratedCurriculum({ ...validCurriculum, modules: [] }),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('rejects non-ISO generated dates', () => {
  assert.throws(
    () => validateGeneratedCurriculum({ ...validCurriculum, deadline: 'Day 7' }),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('rejects generated deadlines in the past', () => {
  assert.throws(
    () =>
      validateGeneratedCurriculum({
        ...validCurriculum,
        deadline: '2020-01-30T00:00:00.000Z',
      }),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('converts malformed JSON into a safe service error', async () => {
  const client: GenerativeModelClient = {
    models: {
      generateContent: async () => ({ text: 'not-json' }) as never,
    },
  }
  await assert.rejects(
    () => new AiService(client).generateCurriculum('Generate a curriculum'),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('accepts JSON wrapped in a markdown fence', async () => {
  const client: GenerativeModelClient = {
    models: {
      generateContent: async () => ({
        text: `\`\`\`json\n${JSON.stringify(validCurriculum)}\n\`\`\``,
      }) as never,
    },
  }
  const result = await new AiService(client).generateCurriculum('Generate a curriculum')
  assert.deepEqual(result, validCurriculum)
})

test('retries transient failures and then succeeds', async () => {
  let calls = 0
  const client: GenerativeModelClient = {
    models: {
      generateContent: async () => {
        calls += 1
        if (calls === 1) {
          throw Object.assign(new Error('temporary failure'), { status: 503 })
        }
        return { text: JSON.stringify(validCurriculum) } as never
      },
    },
  }
  const result = await new AiService(client).generateCurriculum('Generate a curriculum')
  assert.deepEqual(result, validCurriculum)
  assert.equal(calls, 2)
})

test('does not retry invalid credentials', async () => {
  let calls = 0
  const client: GenerativeModelClient = {
    models: {
      generateContent: async () => {
        calls += 1
        throw Object.assign(new Error('unauthorized'), { status: 401 })
      },
    },
  }
  await assert.rejects(
    () => new AiService(client).generateCurriculum('Generate a curriculum'),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_API_KEY',
  )
  assert.equal(calls, 1)
})

test('does not retry exhausted quota responses', async () => {
  let calls = 0
  const client: GenerativeModelClient = {
    models: {
      generateContent: async () => {
        calls += 1
        throw Object.assign(new Error('quota exhausted'), { status: 429 })
      },
    },
  }
  await assert.rejects(
    () => new AiService(client).generateCurriculum('Generate a curriculum'),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_QUOTA_EXCEEDED',
  )
  assert.equal(calls, 1)
})

function fakeProvider(
  name: 'groq' | 'openrouter' | 'gemini',
  generate: AiProvider['generate'],
): AiProvider {
  return { name, model: `${name}-test-model`, generate }
}

test('falls back from Groq quota exhaustion to OpenRouter', async () => {
  let fallbackCalls = 0
  const primary = fakeProvider('groq', async () => {
    throw new AiProviderError('QUOTA_EXCEEDED', 'quota', 'groq', 'groq-test-model', 429)
  })
  const fallback = fakeProvider('openrouter', async () => {
    fallbackCalls += 1
    return {
      text: JSON.stringify(validCurriculum),
      provider: 'openrouter',
      model: 'openrouter-test-model',
      latencyMs: 12,
    }
  })

  const result = await new AiService(undefined, [primary, fallback]).generateCurriculum('Generate a curriculum')
  assert.deepEqual(result, validCurriculum)
  assert.equal(fallbackCalls, 1)
})

test('does not fall back when a provider returns malformed curriculum JSON', async () => {
  let fallbackCalls = 0
  const primary = fakeProvider('groq', async () => ({
    text: 'not-json',
    provider: 'groq',
    model: 'groq-test-model',
    latencyMs: 4,
  }))
  const fallback = fakeProvider('openrouter', async () => {
    fallbackCalls += 1
    return {
      text: JSON.stringify(validCurriculum),
      provider: 'openrouter',
      model: 'openrouter-test-model',
      latencyMs: 5,
    }
  })

  await assert.rejects(
    () => new AiService(undefined, [primary, fallback]).generateCurriculum('Generate a curriculum'),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
  assert.equal(fallbackCalls, 0)
})

test('returns a safe unavailable error when all providers fail', async () => {
  const provider = fakeProvider('groq', async () => {
    throw new AiProviderError('TEMPORARY_FAILURE', 'unavailable', 'groq', 'groq-test-model', 503)
  })
  await assert.rejects(
    () => new AiService(undefined, [provider]).generateCurriculum('Generate a curriculum'),
    (error: unknown) =>
      error instanceof AiServiceError && error.code === 'AI_UNAVAILABLE',
  )
})

test('uses the OpenAI-compatible adapter response contract', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.match(String(input), /api\.groq\.com/)
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(validCurriculum) } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    } as Response
  }) as typeof fetch

  try {
    const response = await new OpenAiCompatibleProvider(
      'groq',
      'test-key',
      'test-model',
      'https://api.groq.com/openai/v1/chat/completions',
    ).generate({ prompt: 'Generate a curriculum', maxOutputTokens: 100 })
    assert.equal(response.provider, 'groq')
    assert.equal(response.usage?.totalTokens, 30)
    assert.equal(JSON.parse(response.text).goal, validCurriculum.goal)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('uses the OpenRouter OpenAI-compatible endpoint', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.match(String(input), /openrouter\.ai/)
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(validCurriculum) } }],
      }),
    } as Response
  }) as typeof fetch

  try {
    const response = await new OpenAiCompatibleProvider(
      'openrouter',
      'test-key',
      'test-model',
      'https://openrouter.ai/api/v1/chat/completions',
    ).generate({ prompt: 'Generate a curriculum', maxOutputTokens: 100 })
    assert.equal(response.provider, 'openrouter')
    assert.equal(JSON.parse(response.text).subject, validCurriculum.subject)
  } finally {
    globalThis.fetch = originalFetch
  }
})
