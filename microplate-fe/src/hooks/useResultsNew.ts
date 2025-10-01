import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resultsServiceNew } from '../services/results.service.new'
import type { 
  PredictionRun, 
  SampleSummary, 
  WellPrediction,
  RowCounts,
  InferenceResult,
  PaginatedResult,
  SampleListParams,
  RunListParams
} from '../services/results.service.new'

// Sample Summary Hooks
export function useSampleSummaryNew(sampleNo?: string) {
  return useQuery<SampleSummary | null>({
    queryKey: ['sampleSummaryNew', sampleNo],
    queryFn: async () => {
      if (!sampleNo) throw new Error('No sample number')
      console.log('useSampleSummaryNew: Fetching summary for sample:', sampleNo)
      try {
        const result = await resultsServiceNew.getSampleSummary(sampleNo)
        console.log('useSampleSummaryNew: API response:', result)
        return result
      } catch (error: unknown) {
        console.error('useSampleSummaryNew: API error:', error)
        
        // Check if it's a NOT_FOUND error (404) - sample doesn't exist yet
        const errorObj = error as { status?: number; message?: string };
        if (errorObj?.status === 404 || errorObj?.message?.includes('NOT_FOUND') || errorObj?.message?.includes('Sample with ID')) {
          console.log('useSampleSummaryNew: Sample not found, returning null instead of throwing')
          return null // Return null instead of throwing error
        }
        
        // For other errors, still throw them
        throw error
      }
    },
    enabled: !!sampleNo,
    retry: (failureCount, error: unknown) => {
      // Don't retry for NOT_FOUND errors (404)
      const errorObj = error as { status?: number; message?: string };
      if (errorObj?.status === 404 || errorObj?.message?.includes('NOT_FOUND') || errorObj?.message?.includes('Sample with ID')) {
        return false
      }
      // Retry other errors up to 3 times
      return failureCount < 3
    },
    retryDelay: 1000,
  })
}

export function useAllSampleSummaries(params: SampleListParams = {}) {
  return useQuery<PaginatedResult<SampleSummary>>({
    queryKey: ['allSampleSummaries', params],
    queryFn: () => resultsServiceNew.getAllSampleSummaries(params),
    staleTime: 30000, // 30 seconds
  })
}

// Prediction Run Hooks
export function usePredictionRun(runId?: number) {
  return useQuery<PredictionRun>({
    queryKey: ['predictionRun', runId],
    queryFn: () => {
      if (!runId) throw new Error('No run ID')
      return resultsServiceNew.getPredictionRun(runId)
    },
    enabled: !!runId,
    staleTime: 30000,
  })
}

export function useAllPredictionRuns(params: RunListParams = {}) {
  return useQuery<PaginatedResult<PredictionRun>>({
    queryKey: ['allPredictionRuns', params],
    queryFn: () => resultsServiceNew.getAllPredictionRuns(params),
    staleTime: 30000,
  })
}

export function useSamplePredictionRuns(sampleNo?: string, params: RunListParams = {}) {
  return useQuery<PaginatedResult<PredictionRun>>({
    queryKey: ['samplePredictionRuns', sampleNo, params],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsServiceNew.getSamplePredictionRuns(sampleNo, params)
    },
    enabled: !!sampleNo,
    staleTime: 30000,
  })
}

// Well Prediction Hooks
export function useWellPredictions(runId?: number) {
  return useQuery<WellPrediction[]>({
    queryKey: ['wellPredictions', runId],
    queryFn: () => {
      if (!runId) throw new Error('No run ID')
      return resultsServiceNew.getWellPredictions(runId)
    },
    enabled: !!runId,
    staleTime: 60000, // 1 minute
  })
}

// Row Counts Hooks
export function useRowCounts(runId?: number) {
  return useQuery<RowCounts[]>({
    queryKey: ['rowCounts', runId],
    queryFn: () => {
      if (!runId) throw new Error('No run ID')
      return resultsServiceNew.getRowCounts(runId)
    },
    enabled: !!runId,
    staleTime: 60000,
  })
}

// Inference Results Hooks
export function useInferenceResults(runId?: number) {
  return useQuery<InferenceResult[]>({
    queryKey: ['inferenceResults', runId],
    queryFn: () => {
      if (!runId) throw new Error('No run ID')
      return resultsServiceNew.getInferenceResults(runId)
    },
    enabled: !!runId,
    staleTime: 60000,
  })
}

// Export Hooks
export function useExportSampleData() {
  return useMutation({
    mutationFn: ({ sampleNo, format }: { sampleNo: string; format?: 'csv' | 'json' | 'xlsx' }) =>
      resultsServiceNew.exportSampleData(sampleNo, format),
    onSuccess: (data, variables) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${variables.sampleNo}_export.${variables.format || 'csv'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Export failed:', error)
    }
  })
}

export function useExportRunData() {
  return useMutation({
    mutationFn: ({ runId, format }: { runId: number; format?: 'csv' | 'json' | 'xlsx' }) =>
      resultsServiceNew.exportRunData(runId, format),
    onSuccess: (data, variables) => {
      // Create download link
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `run_${variables.runId}_export.${variables.format || 'csv'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Export failed:', error)
    }
  })
}

// System Statistics Hook
export function useSystemStatistics() {
  return useQuery({
    queryKey: ['systemStatistics'],
    queryFn: () => resultsServiceNew.getSystemStatistics(),
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
  })
}

// Refresh Hook
export function useRefreshResults() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      // Invalidate all result-related queries
      await queryClient.invalidateQueries({ queryKey: ['sampleSummaryNew'] })
      await queryClient.invalidateQueries({ queryKey: ['allSampleSummaries'] })
      await queryClient.invalidateQueries({ queryKey: ['predictionRun'] })
      await queryClient.invalidateQueries({ queryKey: ['allPredictionRuns'] })
      await queryClient.invalidateQueries({ queryKey: ['samplePredictionRuns'] })
      await queryClient.invalidateQueries({ queryKey: ['wellPredictions'] })
      await queryClient.invalidateQueries({ queryKey: ['rowCounts'] })
      await queryClient.invalidateQueries({ queryKey: ['inferenceResults'] })
      await queryClient.invalidateQueries({ queryKey: ['systemStatistics'] })
    },
    onSuccess: () => {
      console.log('All results data refreshed successfully')
    },
    onError: (error) => {
      console.error('Failed to refresh results:', error)
    }
  })
}
