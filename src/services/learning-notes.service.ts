import { apiRequest } from './api'
import type { LearningNoteResponse, LearningNotesListResponse } from '../types/curriculum'

export const learningNotesService = {
  async list(curriculum?: string): Promise<LearningNotesListResponse> {
    const query = curriculum ? `?curriculum=${encodeURIComponent(curriculum)}` : ''
    return apiRequest<LearningNotesListResponse>(`/learning-notes${query}`, { method: 'GET' })
  },
  async generate(curriculumId: string, moduleKey: string, topicKey: string, regenerate = false): Promise<LearningNoteResponse> {
    return apiRequest<LearningNoteResponse>('/learning-notes/generate', {
      method: 'POST',
      body: JSON.stringify({ curriculumId, moduleKey, topicKey, regenerate }),
    })
  },
  async get(id: string): Promise<LearningNoteResponse> {
    return apiRequest<LearningNoteResponse>(`/learning-notes/${encodeURIComponent(id)}`, { method: 'GET' })
  },
}
