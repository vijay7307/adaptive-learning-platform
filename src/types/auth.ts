export interface UserProfile {
  id: string
  name: string
  email: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthSuccessData {
  user: UserProfile
  token: string
  tokenType: string
  expiresIn: string
}

export interface AuthApiResponse {
  success: boolean
  message?: string
  data: AuthSuccessData
}

export interface ProfileApiResponse {
  success: boolean
  data: {
    user: UserProfile
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    statusCode: number
  }
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface LoginCredentials {
  email: string
  password: string
}
