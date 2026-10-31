import { apiRequest } from './api'
import type {
  CurriculumDetailResponse,
  CurriculumGenerationRequest,
  CurriculumGenerationResponse,
  CurriculumListResponse,
  Curriculum,
} from '../types/curriculum'

export const curriculumService = {
  async generate(
    input: CurriculumGenerationRequest,
    idempotencyKey: string,
  ): Promise<CurriculumGenerationResponse> {
    return apiRequest<CurriculumGenerationResponse>('/curriculums/generate', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(input),
    })
  },

  async list(): Promise<CurriculumListResponse> {
    return apiRequest<CurriculumListResponse>('/curriculums', {
      method: 'GET',
    })
  },

  async getById(id: string): Promise<CurriculumDetailResponse> {
    return apiRequest<CurriculumDetailResponse>(
      `/curriculums/?id=${encodeURIComponent(id)}`,
      { method: 'GET' },
    )
  },

  async updateStatus(id: string, status: Curriculum['status']): Promise<CurriculumDetailResponse> {
    return apiRequest<CurriculumDetailResponse>(`/curriculums/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
}
