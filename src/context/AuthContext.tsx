import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { authService } from '../services/auth.service'
import { getApiAuthToken, setApiAuthToken } from '../services/api'
import type { UserProfile, LoginCredentials, RegisterCredentials } from '../types/auth'

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(() => getApiAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const storedToken = getApiAuthToken()
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    let active = true
    void authService.getMe()
      .then((profileResponse) => {
        if (!active) return
        setUser(profileResponse.data.user)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setToken(null)
        setApiAuthToken(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true)
    try {
      const loginResponse = await authService.login(credentials)
      const accessToken = loginResponse.data.token

      // Store the token and configure the API client header.
      setToken(accessToken)
      setApiAuthToken(accessToken)

      // Retrieve full authenticated user profile (Requirement 5)
      const profileResponse = await authService.getMe()
      setUser(profileResponse.data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    setIsLoading(true)
    try {
      const registerResponse = await authService.register(credentials)
      const accessToken = registerResponse.data.token

      // Store the token and configure the API client header.
      setToken(accessToken)
      setApiAuthToken(accessToken)

      // Retrieve full profile or use registered payload
      const profileResponse = await authService.getMe()
      setUser(profileResponse.data.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback((): void => {
    setUser(null)
    setToken(null)
    setApiAuthToken(null)
  }, [])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
