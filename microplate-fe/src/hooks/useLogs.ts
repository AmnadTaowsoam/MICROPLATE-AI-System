import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logsService } from '../services/logs.service'
import type { LogLevel } from '../services/logs.service'

export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => logsService.getAllLogs(),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 3,
    retryDelay: 1000,
  })
}

export function useLogsByLevel(level: LogLevel) {
  return useQuery({
    queryKey: ['logs', level],
    queryFn: () => logsService.getLogsByLevel(level),
    refetchInterval: 5000,
    retry: 3,
    retryDelay: 1000,
  })
}

export function useClearLogs() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => logsService.clearLogs(),
    onSuccess: () => {
      // Invalidate and refetch logs
      queryClient.invalidateQueries({ queryKey: ['logs'] })
    },
    onError: (error) => {
      console.error('Failed to clear logs:', error)
    }
  })
}
