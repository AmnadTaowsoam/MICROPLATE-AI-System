export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    const response = await fetch(url, { ...options, headers })
    if (!response.ok) {
      const text = await response.text()
      throw new ApiError(response.status, text || 'Request failed')
    }
    return response.json()
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

// Service-specific API instances
export const authApi = new ApiService(import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:6401')
export const imageApi = new ApiService(import.meta.env.VITE_IMAGE_SERVICE_URL || 'http://localhost:6402')
export const visionApi = new ApiService(import.meta.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403')
export const resultsApi = new ApiService(import.meta.env.VITE_RESULTS_SERVICE_URL || 'http://localhost:6404')
export const labwareApi = new ApiService(import.meta.env.VITE_LABWARE_SERVICE_URL || 'http://localhost:6405')
export const predictionApi = new ApiService(import.meta.env.VITE_PREDICTION_SERVICE_URL || 'http://localhost:6406')
export const captureApi = new ApiService(import.meta.env.VITE_VISION_CAPTURE_SERVICE_URL || 'http://localhost:6407')

// Default API (for backward compatibility)
export const api = authApi


