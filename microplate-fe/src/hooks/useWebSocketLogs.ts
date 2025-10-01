import { useState, useEffect, useRef } from 'react'
// Define LogEntry type locally since it's not exported from LogsPanel
interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  timestamp: string;
}

export function useWebSocketLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // WebSocket logs disabled for now - no WebSocket server available
    // TODO: Implement WebSocket logs when backend supports it
    return
    
    // Connect to WebSocket for real-time logs
    const makeWsUrl = () => {
      const explicit = import.meta.env.VITE_WS_URL as string | undefined
      if (explicit) return explicit
      const api = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:6400'
      try {
        const u = new URL(api)
        u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
        u.pathname = (u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname) + '/ws/logs'
        return u.toString()
      } catch {
        return 'ws://localhost:6400/ws/logs'
      }
    }

    let retry = 0
    let stopped = false

    const connect = () => {
      const wsUrl = makeWsUrl()
      try {
        const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        addLog({
          level: 'success',
          message: 'Connected to logs stream',
        })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle different log message formats
          if (data.type === 'log') {
            addLog({
              level: data.level || 'info',
              message: data.message || 'Unknown message',
              details: data.details,
            })
          } else if (data.type === 'progress') {
            addLog({
              level: 'info',
              message: `Progress: ${data.message}`,
              details: data.percentage ? `${data.percentage}%` : undefined,
            })
          } else if (data.type === 'error') {
            addLog({
              level: 'error',
              message: data.message || 'An error occurred',
              details: data.error,
            })
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        addLog({
          level: 'warning',
          message: 'Disconnected from logs stream',
        })
        if (!stopped) {
          const delay = Math.min(15000, 1000 * Math.pow(2, retry++))
          setTimeout(connect, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        addLog({
          level: 'error',
          message: 'WebSocket connection error',
        })
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      addLog({
        level: 'error',
        message: 'Failed to connect to logs stream',
      })
    }
    }

    connect()

    return () => {
      stopped = true
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const addLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    }
    
    setLogs(prev => {
      // Keep only last 50 logs to prevent memory issues
      const updated = [...prev, newLog].slice(-50)
      return updated
    })
  }

  const clearLogs = () => {
    setLogs([])
  }

  return {
    logs,
    isConnected,
    clearLogs,
  }
}
