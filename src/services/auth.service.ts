import { apiRequest } from './api'
import type {
  AuthApiResponse,
  ProfileApiResponse,
  RegisterCredentials,
  LoginCredentials,
} from '../types/auth'

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthApiResponse> {
    return apiRequest<AuthApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  async login(credentials: LoginCredentials): Promise<AuthApiResponse> {
    return apiRequest<AuthApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  async getMe(): Promise<ProfileApiResponse> {
    return apiRequest<ProfileApiResponse>('/auth/me', {
      method: 'GET',
    })
  },
}
