import { apiRequest } from './api'
import type { FeedbackEntry } from '../types/workspace'

export const feedbackService = {
  async list(): Promise<{ data: { feedback: FeedbackEntry[] } }> {
    return apiRequest('/daily-feedback')
  },
  async create(feedback: Omit<FeedbackEntry, '_id' | 'createdAt'>): Promise<{ data: { feedback: FeedbackEntry } }> {
    return apiRequest('/daily-feedback', { method: 'POST', body: JSON.stringify(feedback) })
  },
}
