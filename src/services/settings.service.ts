import { apiRequest } from './api'
import type { UserProfile } from '../types/auth'

export const settingsService = {
  async get(): Promise<{ data: { settings: UserProfile } }> {
    return apiRequest('/settings')
  },
  async updateProfile(profile: Partial<Pick<UserProfile, 'name' | 'email' | 'timezone'>>): Promise<{ data: { settings: UserProfile } }> {
    return apiRequest('/settings', { method: 'PATCH', body: JSON.stringify(profile) })
  },
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiRequest('/settings/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
  },
}
