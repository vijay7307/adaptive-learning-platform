import { apiRequest } from './api'
import type { PracticeAttempt, PracticeSet } from '../types/workspace'

export const practiceService = {
  async listSets(): Promise<{ data: { practiceSets: PracticeSet[] } }> {
    return apiRequest('/practice/sets')
  },
  async listAttempts(): Promise<{ data: { attempts: PracticeAttempt[] } }> {
    return apiRequest('/practice/attempts')
  },
  async start(setKey: string): Promise<{ data: { attempt: PracticeAttempt } }> {
    return apiRequest('/practice/attempts', { method: 'POST', body: JSON.stringify({ practiceSet: setKey }) })
  },
  async submit(attemptKey: string, answers: Array<{ questionKey: string; answer: string }>): Promise<{ data: { attempt: PracticeAttempt } }> {
    return apiRequest(`/practice/attempts/${encodeURIComponent(attemptKey)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) })
  },
}
