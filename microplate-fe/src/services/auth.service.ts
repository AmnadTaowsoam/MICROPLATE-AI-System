import { authApi, imageApi, visionApi, resultsApi, labwareApi, predictionApi, captureApi } from './api'

export type RegisterRequest = {
  email: string
  username: string
  password: string
}

export type RegisterResponse = {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    username: string
    createdAt?: string
  }
}

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  success: boolean
  data?: {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    tokenType?: string
    user?: any
  }
  accessToken?: string
  refreshToken?: string
  message?: string
}

export type ForgotPasswordRequest = { email: string }
export type ForgotPasswordResponse = { message: string }
export type ResetPasswordRequest = { token: string; password: string }
export type ResetPasswordResponse = { message: string }

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const authService = {
  async register(payload: RegisterRequest) {
    return authApi.post<RegisterResponse>('/api/v1/auth/register', payload)
  },
  async login(payload: LoginRequest) {
    const res = await authApi.post<LoginResponse>('/api/v1/auth/login', payload)
    console.log('AuthService: Login response:', res)
    
    // Handle different response structures
    let accessToken = null
    let refreshToken = null
    
    if (res.accessToken) {
      // Direct structure: {accessToken: "...", refreshToken: "..."}
      accessToken = res.accessToken
      refreshToken = res.refreshToken
    } else if (res.data && res.data.accessToken) {
      // Nested structure: {success: true, data: {accessToken: "...", refreshToken: "..."}}
      accessToken = res.data.accessToken
      refreshToken = res.data.refreshToken
    }
    
    console.log('AuthService: Extracted accessToken:', accessToken ? 'Present' : 'Missing')
    console.log('AuthService: Extracted refreshToken:', refreshToken ? 'Present' : 'Missing')
    
    if (accessToken) {
      console.log('AuthService: Storing tokens in localStorage...')
      // Store tokens in localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      console.log('AuthService: Access token stored:', localStorage.getItem(ACCESS_TOKEN_KEY) ? 'Success' : 'Failed')
      
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
        console.log('AuthService: Refresh token stored:', localStorage.getItem(REFRESH_TOKEN_KEY) ? 'Success' : 'Failed')
      }
      
      // Set token for all API instances
      console.log('AuthService: Setting tokens for all services...')
      this.setTokensForAllServices(accessToken)
      console.log('AuthService: Token stored and set for all services')
      
      // Verify token is accessible
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      console.log('AuthService: Verification - stored token present:', !!storedToken)
      console.log('AuthService: Verification - token valid:', this.isTokenValid())
    } else {
      console.error('AuthService: No accessToken found in response')
    }
    
    return res
  },
  async requestPasswordReset(payload: ForgotPasswordRequest) {
    return authApi.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', payload)
  },
  async resetPassword(payload: ResetPasswordRequest) {
    return authApi.post<ResetPasswordResponse>('/api/v1/auth/reset-password', payload)
  },
  async updateProfile(payload: { email?: string; username?: string }) {
    return authApi.put<{ success: boolean; message: string }>('/api/v1/auth/profile', payload)
  },
  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return authApi.put<{ success: boolean; message: string }>('/api/v1/auth/change-password', payload)
  },
  loadTokenFromStorage() {
    console.log('AuthService: Loading token from storage...')
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    console.log('AuthService: Token from storage:', token ? 'Present' : 'Missing')
    if (token) {
      console.log('AuthService: Setting token for all services from storage...')
      // Set token for all API instances
      this.setTokensForAllServices(token)
    }
    return token
  },
  
  // Helper method to set tokens for all services
  setTokensForAllServices(token: string) {
    console.log('AuthService: Setting token for authApi...')
    authApi.setAccessToken(token)
    console.log('AuthService: Setting token for imageApi...')
    imageApi.setAccessToken(token)
    console.log('AuthService: Setting token for visionApi...')
    visionApi.setAccessToken(token)
    console.log('AuthService: Setting token for resultsApi...')
    resultsApi.setAccessToken(token)
    console.log('AuthService: Setting token for labwareApi...')
    labwareApi.setAccessToken(token)
    console.log('AuthService: Setting token for predictionApi...')
    predictionApi.setAccessToken(token)
    console.log('AuthService: Setting token for captureApi...')
    captureApi.setAccessToken(token)
    console.log('AuthService: All services token set complete')
  },
  
  // Helper method to clear tokens from all services
  clearTokensFromAllServices() {
    authApi.setAccessToken('')
    imageApi.setAccessToken('')
    visionApi.setAccessToken('')
    resultsApi.setAccessToken('')
    labwareApi.setAccessToken('')
    predictionApi.setAccessToken('')
    captureApi.setAccessToken('')
  },
  
  // Check if token is valid (not expired)
  isTokenValid(): boolean {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return false
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      return payload.exp && payload.exp > now
    } catch {
      return false
    }
  },
  
  // Get current token
  getCurrentToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  
  // Refresh token (if available)
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    try {
      const res = await authApi.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken })
      
      // Handle different response structures
      let accessToken = null
      let newRefreshToken = null
      
      if (res.accessToken) {
        // Direct structure: {accessToken: "...", refreshToken: "..."}
        accessToken = res.accessToken
        newRefreshToken = res.refreshToken
      } else if (res.data && res.data.accessToken) {
        // Nested structure: {success: true, data: {accessToken: "...", refreshToken: "..."}}
        accessToken = res.data.accessToken
        newRefreshToken = res.data.refreshToken
      }
      
      if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
        }
        this.setTokensForAllServices(accessToken)
        return accessToken
      }
    } catch (error) {
      // If refresh fails, logout user
      this.logout()
      throw error
    }
  },
  
  logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    this.clearTokensFromAllServices()
  },
}


