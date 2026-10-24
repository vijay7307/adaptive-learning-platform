const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

// In-memory token storage (kept in memory, never persisted to localStorage)
let inMemoryToken: string | null = null

export function setApiAuthToken(token: string | null): void {
  inMemoryToken = token
}

export function getApiAuthToken(): string | null {
  return inMemoryToken
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${BASE_URL}${cleanEndpoint}`

  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Attach token from in-memory state if available and not explicitly provided
  if (inMemoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`)
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'Unable to connect to the server. Please check your internet connection or verify the backend is running.',
      0
    )
  }

  let data: any = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${response.status} (${response.statusText})`
    throw new ApiError(errorMessage, response.status)
  }

  return data as T
}
