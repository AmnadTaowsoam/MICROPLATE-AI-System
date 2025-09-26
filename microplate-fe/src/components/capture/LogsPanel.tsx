import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export type LogEntry = {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: string
}

type Props = {
  logs: LogEntry[]
  className?: string
}

export default function LogsPanel({ logs, className = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      default:
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />
    }
  }

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div 
        className="p-3 border-b border-gray-200 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-900">System Logs</h3>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <span className="text-xs text-gray-500">{logs.length} entries</span>
          )}
          <svg 
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No logs available
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className={`p-2 rounded border text-xs ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    {getIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{log.message}</div>
                      {log.details && (
                        <div className="mt-1 text-gray-600">{log.details}</div>
                      )}
                      <div className="mt-1 text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
