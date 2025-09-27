import { useState } from 'react'
import { useLogs, useClearLogs } from '../../hooks/useLogs'
import { logsService } from '../../services/logs.service'
import type { LogLevel } from '../../services/logs.service'
import { ChevronDownIcon, ChevronUpIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

type Props = {
  className?: string
}

export default function LogsPanel({ className = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all')
  
  const { data: logsResponse, isLoading, error, refetch } = useLogs()
  const clearLogsMutation = useClearLogs()
  
  const logs = logsResponse?.data?.logs || []
  const totalLogs = logsResponse?.data?.total || 0

  // Filter logs by level
  const filteredLogs = selectedLevel === 'all' 
    ? logs 
    : logs.filter(log => log.level === selectedLevel)

  // Get log statistics
  const stats = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {} as Record<LogLevel, number>)

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      await clearLogsMutation.mutateAsync()
    }
  }

  const getStatusBadge = (statusCode: number) => {
    const color = logsService.getStatusColor(statusCode)
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} bg-opacity-20`}>
        {statusCode}
      </span>
    )
  }

  const getMethodBadge = (method: string) => {
    const color = logsService.getMethodColor(method)
    return (
      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${color}`}>
        {method}
      </span>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-lg">📊</div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Logs</h3>
          </div>
          
          {/* Log Statistics */}
          <div className="flex items-center gap-2">
            {stats.info > 0 && (
              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                {stats.info} info
              </span>
            )}
            {stats.warn > 0 && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                {stats.warn} warn
              </span>
            )}
            {stats.error > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                {stats.error} error
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalLogs} entries
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Filter:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Refresh logs"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearLogsMutation.isPending}
                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors"
                title="Clear all logs"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Logs Content */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                Loading logs...
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">
                <div className="text-sm">Error loading logs:</div>
                <div className="text-xs mt-1">{error.message}</div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-sm">No logs available</div>
                <div className="text-xs mt-1">
                  {selectedLevel === 'all' ? 'No logs found' : `No ${selectedLevel} logs found`}
                </div>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  className={`p-3 rounded-lg border text-xs transition-all hover:shadow-sm ${logsService.getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">{logsService.getLevelIcon(log.level)}</div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1">
                        {getMethodBadge(log.method)}
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {log.url}
                        </span>
                        {getStatusBadge(log.statusCode)}
                        <span className="text-gray-500 dark:text-gray-400">
                          {log.latencyMs}ms
                        </span>
                      </div>
                      
                      {/* Message */}
                      {log.message && (
                        <div className="font-medium mb-1">{log.message}</div>
                      )}
                      
                      {/* Details */}
                      <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                        <span>{logsService.formatTimestamp(log.time)}</span>
                        {log.service && (
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                            {log.service}
                          </span>
                        )}
                        {log.requestId && (
                          <span className="font-mono text-xs">
                            {log.requestId}
                          </span>
                        )}
                        {log.ip && (
                          <span className="font-mono text-xs">
                            {log.ip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

