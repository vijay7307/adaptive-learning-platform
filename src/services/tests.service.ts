import { apiRequest } from './api'
import type { TestAttempt, TestDefinition } from '../types/workspace'

export const testsService = {
  async list(): Promise<{ data: { tests: TestDefinition[]; nextTestAt?: string | null } }> {
    return apiRequest('/tests')
  },
  async attempts(): Promise<{ data: { attempts: TestAttempt[] } }> {
    return apiRequest('/tests/history')
  },
  async start(testKey: string): Promise<{ data: { attempt: TestAttempt } }> {
    return apiRequest(`/tests/${encodeURIComponent(testKey)}/attempts`, { method: 'POST' })
  },
  async saveProgress(attemptKey: string, answers: Array<{ questionKey: string; answer: string }>): Promise<{ data: { attempt: TestAttempt } }> {
    return apiRequest(`/tests/attempts/${encodeURIComponent(attemptKey)}`, { method: 'PATCH', body: JSON.stringify({ answers }) })
  },
  async submit(attemptKey: string, answers: Array<{ questionKey: string; answer: string }>): Promise<{ data: { attempt: TestAttempt } }> {
    return apiRequest(`/tests/attempts/${encodeURIComponent(attemptKey)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })
  },
  async evaluate(attemptKey: string): Promise<{ data: { attempt: TestAttempt } }> {
    return apiRequest(`/tests/attempts/${encodeURIComponent(attemptKey)}/evaluate`, { method: 'POST' })
  },
}
