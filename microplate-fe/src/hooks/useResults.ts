import { useQuery } from '@tanstack/react-query'
import { resultsService } from '../services/results.service'
import type { 
  SampleResult, 
  SampleSummary, 
  InterfaceFile 
} from '../services/results.service'

export function useSampleResult(sampleNo?: string) {
  return useQuery<SampleResult>({
    queryKey: ['sampleResult', sampleNo],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsService.getSample(sampleNo)
    },
    enabled: !!sampleNo,
  })
}

export function useSampleSummary(sampleNo?: string) {
  return useQuery<SampleSummary | null>({
    queryKey: ['sampleSummary', sampleNo],
    queryFn: async () => {
      if (!sampleNo) throw new Error('No sample number')
      logger.debug('useSampleSummary: Fetching summary for sample:', sampleNo)
      try {
        const result = await resultsService.getSampleSummary(sampleNo)
        logger.debug('useSampleSummary: API response:', result)
        return result
      } catch (error: unknown) {
        logger.error('useSampleSummary: API error:', error)
        
        // Check if it's a NOT_FOUND error (404) - sample doesn't exist yet
        const errorObj = error as { status?: number; message?: string };
        if (errorObj?.status === 404 || errorObj?.message?.includes('NOT_FOUND') || errorObj?.message?.includes('Sample with ID')) {
          logger.debug('useSampleSummary: Sample not found, returning null instead of throwing')
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

export function useSamples(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) {
  return useQuery<unknown>({
    queryKey: ['samples', params],
    queryFn: () => resultsService.getSamples(params.page || 1, params.limit || 10, params.search, params.sortBy, params.sortOrder),
    staleTime: 30000, // 30 seconds
  })
}

export function useSampleRuns(sampleNo?: string, params: {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) {
  return useQuery<unknown>({
    queryKey: ['sampleRuns', sampleNo, params],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsService.getSampleRuns(sampleNo, params.page || 1, params.limit || 10)
    },
    enabled: !!sampleNo,
    staleTime: 30000,
  })
}

export function useRunDetails(runId?: number) {
  return useQuery<unknown>({
    queryKey: ['runDetails', runId],
    queryFn: () => {
      if (!runId) throw new Error('No run ID')
      return resultsService.getRunDetails(runId)
    },
    enabled: !!runId,
    staleTime: 30000,
  })
}

export function useInterfaceFiles(sampleNo?: string) {
  return useQuery<{ data: InterfaceFile[] }>({
    queryKey: ['interfaceFiles', sampleNo],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsService.getInterfaceFiles(sampleNo)
    },
    enabled: !!sampleNo,
    staleTime: 60000, // 1 minute
  })
}


