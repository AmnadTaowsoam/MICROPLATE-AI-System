import { resultsApi } from './api'
import logger from '../utils/logger'

// Helper function to get token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken')
}

// Types based on the Prisma schema
export interface PredictionRun {
  id: number
  sampleNo: string
  submissionNo?: string
  description?: string
  predictAt: string
  annotatedImagePath?: string
  rawImagePath?: string
  modelVersion?: string
  status: string
  errorMsg?: string
  processingTimeMs?: number
  confidenceThreshold?: number
  createdBy?: string
  createdAt: string
  updatedAt: string
  rowCounts: RowCounts[]
  inferenceResults: InferenceResult[]
  wellPredictions: WellPrediction[]
}

export interface RowCounts {
  id: number
  runId: number
  counts: {
    positive: number
    negative: number
    invalid: number
  }
  createdAt: string
}

export interface InferenceResult {
  id: number
  runId: number
  results: any // JSON data
  createdAt: string
}

export interface WellPrediction {
  id: number
  runId: number
  wellId: string
  label: string
  class_: string
  confidence: number
  bbox: {
    xmin: number
    ymin: number
    xmax: number
    ymax: number
  }
  createdAt: string
}

export interface SampleSummary {
  sampleNo: string
  summary: {
    distribution: {
      positive: number
      negative: number
      invalid: number
    }
  }
  totalRuns: number
  lastRunAt?: string
  lastRunId?: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedResult<T> {
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

export interface SampleListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface RunListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  sampleNo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export const resultsServiceNew = {
  // Sample Summary Operations
  async getSampleSummary(sampleNo: string): Promise<SampleSummary> {
    logger.debug('resultsServiceNew: Getting sample summary for:', sampleNo)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    try {
      logger.debug('🔍 Using resultsApi for getSampleSummary - result-api-service gets data from prediction_result.sample_summary')
      const result = await resultsApi.get<SampleSummary>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/summary`)
      logger.debug('resultsServiceNew: API response received:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: API request failed:', error)
      throw error
    }
  },

  async getAllSampleSummaries(params: SampleListParams = {}): Promise<PaginatedResult<SampleSummary>> {
    logger.debug('resultsServiceNew: Getting all sample summaries with params:', params)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    logger.debug('🔍 Using resultsApi for getAllSampleSummaries - result-api-service gets data from prediction_result.sample_summary')
    
    const searchParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 15).toString(),
      sortBy: params.sortBy || 'updatedAt',
      sortOrder: params.sortOrder || 'desc',
      ...(params.search && { search: params.search })
    })

    try {
      const result = await resultsApi.get<PaginatedResult<SampleSummary>>(`/api/v1/results/samples?${searchParams}`)
      logger.debug('resultsServiceNew: Sample summaries response:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get sample summaries:', error)
      throw error
    }
  },

  // Prediction Run Operations
  async getPredictionRun(runId: number): Promise<PredictionRun> {
    logger.debug('resultsServiceNew: Getting prediction run:', runId)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<PredictionRun>(`/api/v1/results/runs/${runId}`)
      logger.debug('resultsServiceNew: Prediction run response:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get prediction run:', error)
      throw error
    }
  },

  async getAllPredictionRuns(params: RunListParams = {}): Promise<PaginatedResult<PredictionRun>> {
    logger.debug('resultsServiceNew: Getting all prediction runs with params:', params)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    const searchParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 15).toString(),
      sortBy: params.sortBy || 'predictAt',
      sortOrder: params.sortOrder || 'desc',
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
      ...(params.sampleNo && { sampleNo: params.sampleNo }),
      ...(params.dateFrom && { dateFrom: params.dateFrom }),
      ...(params.dateTo && { dateTo: params.dateTo })
    })

    try {
      const result = await resultsApi.get<PaginatedResult<PredictionRun>>(`/api/v1/results/runs?${searchParams}`)
      logger.debug('resultsServiceNew: Prediction runs response:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get prediction runs:', error)
      throw error
    }
  },

  async getSamplePredictionRuns(sampleNo: string, params: RunListParams = {}): Promise<PaginatedResult<PredictionRun>> {
    logger.debug('resultsServiceNew: Getting prediction runs for sample:', sampleNo)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    const searchParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 15).toString(),
      sortBy: params.sortBy || 'predictAt',
      sortOrder: params.sortOrder || 'desc',
      ...(params.status && { status: params.status })
    })

    try {
      const result = await resultsApi.get<PaginatedResult<PredictionRun>>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/runs?${searchParams}`)
      logger.debug('resultsServiceNew: Sample prediction runs response:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get sample prediction runs:', error)
      throw error
    }
  },

  // Well Prediction Operations
  async getWellPredictions(runId: number): Promise<WellPrediction[]> {
    logger.debug('resultsServiceNew: Getting well predictions for run:', runId)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<{ data: WellPrediction[] }>(`/api/v1/results/runs/${runId}/well-predictions`)
      logger.debug('resultsServiceNew: Well predictions response:', result)
      return result.data
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get well predictions:', error)
      throw error
    }
  },

  // Row Counts Operations
  async getRowCounts(runId: number): Promise<RowCounts[]> {
    logger.debug('resultsServiceNew: Getting row counts for run:', runId)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<{ data: RowCounts[] }>(`/api/v1/results/runs/${runId}/row-counts`)
      logger.debug('resultsServiceNew: Row counts response:', result)
      return result.data
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get row counts:', error)
      throw error
    }
  },

  // Inference Results Operations
  async getInferenceResults(runId: number): Promise<InferenceResult[]> {
    logger.debug('resultsServiceNew: Getting inference results for run:', runId)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      // Use the existing /api/v1/results/runs/{runId} endpoint which includes inferenceResults
      const result = await resultsApi.get<{ data: any }>(`/api/v1/results/runs/${runId}`)
      logger.debug('resultsServiceNew: Run details response:', result)
      
      // Extract inferenceResults from the run details
      if (result.data && result.data.inferenceResults && Array.isArray(result.data.inferenceResults)) {
        return result.data.inferenceResults
      }
      
      return []
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get inference results:', error)
      throw error
    }
  },

  // Export Operations
  async exportSampleData(sampleNo: string, format: 'csv' | 'json' | 'xlsx' = 'csv'): Promise<Blob> {
    logger.debug('resultsServiceNew: Exporting sample data for:', sampleNo, 'format:', format)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<Blob>(`/api/v1/results/samples/${encodeURIComponent(sampleNo)}/export?format=${format}`)
      logger.debug('resultsServiceNew: Export response received')
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to export sample data:', error)
      throw error
    }
  },

  async exportRunData(runId: number, format: 'csv' | 'json' | 'xlsx' = 'csv'): Promise<Blob> {
    logger.debug('resultsServiceNew: Exporting run data for:', runId, 'format:', format)
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<Blob>(`/api/v1/results/runs/${runId}/export?format=${format}`)
      logger.debug('resultsServiceNew: Export response received')
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to export run data:', error)
      throw error
    }
  },

  // Statistics Operations
  async getSystemStatistics(): Promise<{
    totalSamples: number
    totalRuns: number
    totalWellPredictions: number
    averageProcessingTime: number
    successRate: number
    recentActivity: any[]
  }> {
    logger.debug('resultsServiceNew: Getting system statistics')
    const token = getAuthToken()
    if (token) {
      resultsApi.setAccessToken(token)
    }
    
    try {
      const result = await resultsApi.get<any>(`/api/v1/results/statistics`)
      logger.debug('resultsServiceNew: System statistics response:', result)
      return result
    } catch (error) {
      logger.error('resultsServiceNew: Failed to get system statistics:', error)
      throw error
    }
  }
}
