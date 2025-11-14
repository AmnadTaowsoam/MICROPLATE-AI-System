export class ApiError extends Error {
  status: number
  isConnectionError: boolean = false
  
  constructor(status: number, message: string, isConnectionError: boolean = false) {
    super(message)
    this.status = status
    this.isConnectionError = isConnectionError
    this.name = 'ApiError'
  }
}

export class ApiService {
  private baseURL: string
  private accessToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    if (this.accessToken) {
      ;(headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`
    }
    
    try {
      const response = await fetch(url, { 
        ...options, 
        headers,
        signal: options.signal
      }).catch((fetchError: any) => {
        // Catch fetch errors early - these are network or CORS errors
        // Note: Browser will still show CORS errors in console (security feature)
        // but we can handle them gracefully in our code
        
        const errorMessage = fetchError?.message || String(fetchError || '')
        
        // CORS errors: TypeError with "Failed to fetch" but no connection refused
        // When CORS fails, browser shows error in console but fetch throws TypeError
        const isCorsError = (fetchError instanceof TypeError || fetchError?.name === 'TypeError') &&
                           errorMessage.includes('Failed to fetch') &&
                           !errorMessage.includes('ERR_CONNECTION_REFUSED') &&
                           !errorMessage.includes('ERR_FAILED')
        
        if (isCorsError) {
          throw new ApiError(0, `CORS error: Backend service at ${url} is running but CORS is not configured. Gateway should handle CORS.`, true)
        }
        
        // Network errors (connection refused, failed, etc.)
        if (fetchError instanceof TypeError || 
            fetchError?.name === 'TypeError' || 
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('ERR_CONNECTION_REFUSED') ||
            errorMessage.includes('ERR_FAILED') ||
            errorMessage.includes('NetworkError')) {
          throw new ApiError(0, `Network error: Unable to connect to ${url}. Backend service may not be running.`, true)
        }
        
        throw fetchError
      })
      
      if (!response.ok) {
        const text = await response.text()
        throw new ApiError(response.status, text || 'Request failed')
      }
      return response.json()
    } catch (error: any) {
      // Re-throw ApiError as-is (already has proper structure)
      if (error instanceof ApiError) {
        throw error
      }
      
      // Handle CORS errors (fallback check)
      const errorMessage = error?.message || String(error || '')
      if (errorMessage.includes('CORS') || 
          errorMessage.includes('Access-Control-Allow-Origin') ||
          errorMessage.includes('preflight')) {
        throw new ApiError(0, `CORS error: Backend service at ${url} is running but CORS is not configured. Gateway should handle CORS.`, true)
      }
      
      // Enhance network errors with more context
      if (error instanceof TypeError || 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('ERR_FAILED') ||
          errorMessage.includes('NetworkError')) {
        throw new ApiError(0, `Network error: Unable to connect to ${url}. Backend service may not be running.`, true)
      }
      
      // Wrap other errors
      throw new ApiError(0, errorMessage || 'Unknown error', false)
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }
  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined })
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // For multipart form data uploads (images)
  postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {}
    if (this.accessToken) {
      ;(headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`
    }
    // Don't set Content-Type for FormData - let browser set it with boundary

    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const text = await response.text()
        throw new ApiError(response.status, text || 'Upload failed')
      }
      return response.json()
    })
  }
}

export const authApi = new ApiService(process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:6401')
export const imageApi = new ApiService(process.env.VITE_IMAGE_SERVICE_URL || 'http://localhost:6402')
export const visionApi = new ApiService(process.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403')
export const resultsApi = new ApiService(process.env.VITE_RESULTS_SERVICE_URL || 'http://localhost:6404')
export const labwareApi = new ApiService(process.env.VITE_LABWARE_SERVICE_URL || 'http://localhost:6405')
export const predictionApi = new ApiService(process.env.VITE_PREDICTION_SERVICE_URL || 'http://localhost:6406')
const defaultCaptureBaseUrl =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:6410'

export const captureApi = new ApiService(process.env.VITE_VISION_CAPTURE_SERVICE_URL || defaultCaptureBaseUrl)

// Default API (for backward compatibility)
export const api = authApi


