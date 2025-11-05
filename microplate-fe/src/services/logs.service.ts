import { ApiService } from './api'
import logger from '../utils/logger'

export type LogLevel = 'info' | 'error' | 'warn'

export type LogEntry = {
  id: string
  time: number
  level: LogLevel
  method: string
  url: string
  statusCode: number
  latencyMs: number
  requestId?: string
  userId?: string
  ip?: string
  service?: string
  message?: string
}

export type LogsResponse = {
  success: boolean
  data: {
    logs: LogEntry[]
    total: number
    level?: LogLevel
  }
}

export type LogsStats = {
  total: number
  byLevel: Record<LogLevel, number>
  oldest?: number
  newest?: number
}

// Create API service for logs
const logsApi = new ApiService(process.env.VITE_RESULTS_SERVICE_URL || 'http://localhost:6404')

export const logsService = {
  async getAllLogs(): Promise<LogsResponse> {
    logger.debug('logsService: Getting all logs')
    return logsApi.get<LogsResponse>('/api/v1/results/logs')
  },

  async getLogsByLevel(level: LogLevel): Promise<LogsResponse> {
    logger.debug('logsService: Getting logs by level:', level)
    return logsApi.get<LogsResponse>(`/api/v1/results/logs?level=${level}`)
  },

  async clearLogs(): Promise<{ success: boolean; message: string }> {
    logger.debug('logsService: Clearing logs')
    return logsApi.delete<{ success: boolean; message: string }>('/api/v1/results/logs')
  },

  // Helper methods
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  },

  getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600'
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600'
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600'
    if (statusCode >= 500) return 'text-red-600'
    return 'text-gray-600'
  },

  getLevelColor(level: LogLevel): string {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  },

  getLevelIcon(level: LogLevel): string {
    switch (level) {
      case 'info':
        return 'ℹ️'
      case 'warn':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return '📝'
    }
  },

  getMethodColor(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-green-600 bg-green-50'
      case 'POST':
        return 'text-blue-600 bg-blue-50'
      case 'PUT':
        return 'text-yellow-600 bg-yellow-50'
      case 'DELETE':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }
}
