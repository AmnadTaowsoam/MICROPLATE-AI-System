import { resultsApi } from './api'

// Helper function to get token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken')
}

export type WellPrediction = { id: string; confidence: number; label: 'positive' | 'negative' }
export type LastRun = {
  statistics: {
    totalDetections: number
    positiveCount: number
    negativeCount: number
    averageConfidence: number
  }
  wellPredictions: WellPrediction[]
  status: string
  predictAt: string
}

export type SampleResult = {
  sampleNo: string
  lastRun?: LastRun
}

export type SampleSummary = {
  sampleNo: string
  summary: {
    distribution: Record<string, number>
    concentration?: any
    quality_metrics?: any
  }
  totalRuns: number
  lastRunAt: string | null
  lastRunId: number | null
  createdAt: string
  updatedAt: string
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export type SampleListItem = {
  sampleNo: string
  summary: {
    distribution: Record<string, number>
    concentration?: any
    quality_metrics?: any
  }
  totalRuns: number
  lastRunAt: string | null
  lastRunId: number | null
  createdAt: string
  updatedAt: string
}

export type RunDetails = {
  id: number
  sampleNo: string
  status: string
  predictAt: string
  createdAt: string
  updatedAt: string
  inferenceResults?: any[]
  wellPredictions?: any[]
  rowCounts?: any[]
}

export type InterfaceFile = {
  filename: string
  size: number
  createdAt: string
  downloadUrl: string
}

export const resultsService = {
  getSample(sampleNo: string) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    return resultsApi.get<SampleResult>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}`)
  },
  
  async getSampleSummary(sampleNo: string) {
    console.log('resultsService: Getting sample summary for:', sampleNo)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    try {
      console.log('🔍 Using resultsApi for getSampleSummary - result-api-service gets data from prediction_result.sample_summary')
      const result = await resultsApi.get<SampleSummary>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/summary`)
      console.log('resultsService: API response received:', result)
      return result
    } catch (error) {
      console.error('resultsService: API request failed:', error)
      throw error
    }
  },

  // New methods for the Results page
  getSamples(page: number = 1, limit: number = 15, sortBy: string = 'updatedAt', sortOrder: string = 'desc', search?: string) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
      ...(search && { search })
    })
    console.log('🔍 Using resultsApi for getSamples - result-api-service gets data from prediction_result.sample_summary')
    return resultsApi.get<{success: boolean, data: PaginatedResult<SampleListItem>}>(`/api/v1/results/samples?${params}`)
  },

  getSampleRuns(sampleNo: string, page: number = 1, limit: number = 10) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    return resultsApi.get<{success: boolean, data: PaginatedResult<RunDetails>}>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/runs?${params}`)
  },

  getRunDetails(runId: number) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    return resultsApi.get<{success: boolean, data: RunDetails}>(`/api/v1/results/runs/${runId}`)
  },

  getInterfaceFiles(sampleNo: string) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    return resultsApi.get<{success: boolean, data: InterfaceFile[]}>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/interface-files`)
  },

  downloadInterfaceFile(sampleNo: string, filename: string) {
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    return resultsApi.get<Blob>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/interface-files/${encodeURIComponent(filename)}/download`)
  }
}


