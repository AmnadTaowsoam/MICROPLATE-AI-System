import { useQuery } from '@tanstack/react-query';
import { resultsServiceDirect, type SampleSummary, type PredictionRunSummary, type PaginatedResult } from '../services/results.service.direct';

// Hook for getting sample summary directly from database
export function useSampleSummaryDirect(sampleNo?: string) {
  return useQuery<SampleSummary | null>({
    queryKey: ['sampleSummaryDirect', sampleNo],
    queryFn: async () => {
      if (!sampleNo) throw new Error('No sample number');
      console.log('useSampleSummaryDirect: Fetching summary for sample:', sampleNo);
      try {
        const result = await resultsServiceDirect.getSampleSummary(sampleNo);
        console.log('useSampleSummaryDirect: API response:', result);
        return result;
      } catch (error: any) {
        console.error('useSampleSummaryDirect: API error:', error);
        
        // Check if it's a NOT_FOUND error (404) - sample doesn't exist yet
        if (error?.status === 404 || error?.message?.includes('NOT_FOUND') || error?.message?.includes('Sample with ID')) {
          console.log('useSampleSummaryDirect: Sample not found, returning null instead of throwing');
          return null; // Return null instead of throwing error
        }
        
        // For other errors, still throw them
        throw error;
      }
    },
    enabled: !!sampleNo,
    retry: (failureCount, error: any) => {
      // Don't retry for NOT_FOUND errors (404)
      if (error?.status === 404 || error?.message?.includes('NOT_FOUND') || error?.message?.includes('Sample with ID')) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: 1000,
  });
}

// Hook for getting sample runs directly from database
export function useSampleRunsDirect(
  sampleNo?: string,
  options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
) {
  return useQuery<PaginatedResult<PredictionRunSummary>>({
    queryKey: ['sampleRunsDirect', sampleNo, options],
    queryFn: async () => {
      if (!sampleNo) throw new Error('No sample number');
      console.log('useSampleRunsDirect: Fetching runs for sample:', sampleNo, options);
      const result = await resultsServiceDirect.getSampleRuns(sampleNo, options);
      console.log('useSampleRunsDirect: API response:', result);
      return result;
    },
    enabled: !!sampleNo,
    retry: 3,
    retryDelay: 1000,
  });
}

// Hook for getting run details directly from database
export function useRunDetailsDirect(runId?: number) {
  return useQuery({
    queryKey: ['runDetailsDirect', runId],
    queryFn: async () => {
      if (!runId) throw new Error('No run ID');
      console.log('useRunDetailsDirect: Fetching run details for:', runId);
      const result = await resultsServiceDirect.getRunDetails(runId);
      console.log('useRunDetailsDirect: API response:', result);
      return result;
    },
    enabled: !!runId,
    retry: 3,
    retryDelay: 1000,
  });
}
