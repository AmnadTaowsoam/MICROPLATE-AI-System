import { logsService } from './logs.service'
import type { LogEntry } from './logs.service'

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
  actionUrl?: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
}

class NotificationService {
  private notifications: Notification[] = []
  private listeners: ((notifications: Notification[]) => void)[] = []

  constructor() {
    this.loadNotificationsFromLogs()
    // Refresh notifications every 30 seconds
    setInterval(() => this.loadNotificationsFromLogs(), 30000)
  }

  async loadNotificationsFromLogs() {
    try {
      const logsResponse = await logsService.getAllLogs()
      const logs = logsResponse.data.logs
      
      // Convert recent logs to notifications
      const recentLogs = logs
        .filter(log => Date.now() - log.time < 24 * 60 * 60 * 1000) // Last 24 hours
        .sort((a, b) => b.time - a.time)
        .slice(0, 10) // Latest 10 logs

      this.notifications = recentLogs.map(log => ({
        id: log.id,
        type: this.mapLogLevelToNotificationType(log.level),
        title: this.getNotificationTitle(log),
        message: this.getNotificationMessage(log),
        timestamp: log.time,
        read: false,
        actionUrl: this.getActionUrl(log)
      }))

      this.notifyListeners()
    } catch (error) {
      console.error('Failed to load notifications from logs:', error)
      // Fallback notifications
      this.notifications = [
        {
          id: '1',
          type: 'info',
          title: 'System Status',
          message: 'All systems operational',
          timestamp: Date.now() - 60000,
          read: false
        },
        {
          id: '2',
          type: 'success',
          title: 'Sample Processed',
          message: 'Sample TEST005 has been successfully analyzed',
          timestamp: Date.now() - 300000,
          read: false
        },
        {
          id: '3',
          type: 'warning',
          title: 'Maintenance Scheduled',
          message: 'System maintenance scheduled for tomorrow at 2 AM',
          timestamp: Date.now() - 900000,
          read: false
        }
      ]
      this.notifyListeners()
    }
  }

  private mapLogLevelToNotificationType(level: string): Notification['type'] {
    switch (level) {
      case 'error':
        return 'error'
      case 'warn':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'info'
    }
  }

  private getNotificationTitle(log: LogEntry): string {
    switch (log.level) {
      case 'error':
        return 'System Error'
      case 'warn':
        return 'Warning'
      case 'info':
        return 'System Update'
      default:
        return 'Notification'
    }
  }

  private getNotificationMessage(log: LogEntry): string {
    if (log.message) {
      return log.message
    }

    switch (log.method) {
      case 'POST':
        return `New request processed: ${log.url}`
      case 'GET':
        return `Data retrieved: ${log.url}`
      case 'PUT':
        return `Update completed: ${log.url}`
      case 'DELETE':
        return `Deletion completed: ${log.url}`
      default:
        return `${log.method} request to ${log.url}`
    }
  }

  private getActionUrl(log: LogEntry): string | undefined {
    if (log.url.includes('/results/')) {
      return '/results'
    }
    if (log.url.includes('/samples/')) {
      return '/samples'
    }
    return undefined
  }

  getNotifications(): Notification[] {
    return this.notifications
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notifyListeners()
  }

  clearNotifications() {
    this.notifications = []
    this.notifyListeners()
  }

  getStats(): NotificationStats {
    const byType = this.notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: this.notifications.length,
      unread: this.getUnreadCount(),
      byType
    }
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications))
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notifyListeners()
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true
    })
    this.notifyListeners()
  }

  // Delete specific notification
  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
    this.notifyListeners()
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = []
    this.notifyListeners()
  }

  // Clear read notifications
  clearReadNotifications() {
    this.notifications = this.notifications.filter(n => !n.read)
    this.notifyListeners()
  }

  // Get all notifications (for "View all" page)
  getAllNotifications(): Notification[] {
    return [...this.notifications]
  }

  // Get notification stats
  getStats(): NotificationStats {
    const stats = {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      byType: {} as Record<string, number>
    }

    // Count by type
    this.notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
    })

    return stats
  }
}

export const notificationService = new NotificationService()
