import { apiRequest } from './api'
import type { TestAttempt, TestDefinition } from '../types/workspace'

export const testsService = {
  async list(): Promise<{ data: { tests: TestDefinition[] } }> {
    return apiRequest('/tests')
  },
  async attempts(): Promise<{ data: { attempts: TestAttempt[] } }> {
    return apiRequest('/tests/history')
  },
  async start(testKey: string): Promise<{ data: { attempt: TestAttempt } }> {
    return apiRequest(`/tests/${encodeURIComponent(testKey)}/attempts`, { method: 'POST' })
  },
}
