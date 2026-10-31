import { apiRequest } from './api'
import type {
  DailyTargetItemResponse,
  DailyTargetResponse,
  ExtraWorkResponse,
  ExtraWorkItemResponse,
  ExtraWorkStatusResponse,
} from '../types/curriculum'

export const dailyTargetService = {
  async list(date = new Date().toISOString()): Promise<DailyTargetResponse> {
    return apiRequest<DailyTargetResponse>(`/daily-targets?date=${encodeURIComponent(date)}`, { method: 'GET' })
  },

  async updateItem(
    targetId: string,
    topicKey: string,
    status: 'pending' | 'completed' | 'missed',
  ): Promise<DailyTargetItemResponse> {
    return apiRequest<DailyTargetItemResponse>(
      `/daily-targets/${encodeURIComponent(targetId)}/items/${encodeURIComponent(topicKey)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    )
  },

  async extraStatus(): Promise<ExtraWorkStatusResponse> {
    return apiRequest<ExtraWorkStatusResponse>('/daily-targets/extra/status', { method: 'GET' })
  },

  async generateExtra(curriculumId: string): Promise<ExtraWorkResponse> {
    return apiRequest<ExtraWorkResponse>('/daily-targets/extra', {
      method: 'POST',
      body: JSON.stringify({ curriculumId }),
    })
  },

  async updateExtraItem(
    generationId: string,
    itemKey: string,
    status: 'pending' | 'completed' | 'missed',
  ): Promise<ExtraWorkItemResponse> {
    return apiRequest<ExtraWorkItemResponse>(
      `/daily-targets/extra/${encodeURIComponent(generationId)}/items/${encodeURIComponent(itemKey)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    )
  },
}
