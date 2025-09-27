import { useQuery } from '@tanstack/react-query'
import { resultsService } from '../services/results.service'
import type { 
  SampleResult, 
  SampleSummary, 
  SampleListResponse, 
  RunDetails, 
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
  return useQuery<SampleSummary>({
    queryKey: ['sampleSummary', sampleNo],
    queryFn: async () => {
      if (!sampleNo) throw new Error('No sample number')
      console.log('useSampleSummary: Fetching summary for sample:', sampleNo)
      try {
        const result = await resultsService.getSampleSummary(sampleNo)
        console.log('useSampleSummary: API response:', result)
        return result
      } catch (error) {
        console.error('useSampleSummary: API error:', error)
        throw error
      }
    },
    enabled: !!sampleNo,
    retry: 3,
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
  return useQuery<SampleListResponse>({
    queryKey: ['samples', params],
    queryFn: () => resultsService.getSamples(params),
    keepPreviousData: true,
    staleTime: 30000, // 30 seconds
  })
}

export function useSampleRuns(sampleNo?: string, params: {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) {
  return useQuery<{ data: RunDetails[], pagination: any }>({
    queryKey: ['sampleRuns', sampleNo, params],
    queryFn: () => {
      if (!sampleNo) throw new Error('No sample number')
      return resultsService.getSampleRuns(sampleNo, params)
    },
    enabled: !!sampleNo,
    staleTime: 30000,
  })
}

export function useRunDetails(runId?: number) {
  return useQuery<RunDetails>({
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
    queryFn: () => resultsService.getInterfaceFiles(sampleNo),
    enabled: !!sampleNo,
    staleTime: 60000, // 1 minute
  })
}


