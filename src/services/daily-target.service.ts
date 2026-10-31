import { apiRequest } from './api'
import type { DailyTargetItemResponse, DailyTargetResponse } from '../types/curriculum'

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
}
