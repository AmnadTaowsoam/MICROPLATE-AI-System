import { useState, useEffect } from 'react';
import { MdArrowBack, MdDelete, MdMarkEmailRead, MdClearAll, MdNotifications, MdCheckCircle, MdWarning, MdError, MdInfo } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { notificationService } from '../services/notification.service';
import type { Notification } from '../services/notification.service';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState(notificationService.getStats());

  useEffect(() => {
    // Load notifications
    const loadNotifications = () => {
      setNotifications(notificationService.getAllNotifications());
      setStats(notificationService.getStats());
    };

    // Initial load
    loadNotifications();

    // Subscribe to changes
    const unsubscribe = notificationService.subscribe(loadNotifications);

    return unsubscribe;
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDelete = (id: string) => {
    notificationService.deleteNotification(id);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      notificationService.clearNotifications();
    }
  };

  const handleClearRead = () => {
    notificationService.clearReadNotifications();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <MdCheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <MdWarning className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <MdError className="h-5 w-5 text-red-600" />;
      case 'info':
        return <MdInfo className="h-5 w-5 text-blue-600" />;
      default:
        return <MdNotifications className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <MdArrowBack className="h-5 w-5" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {stats.total} total notifications, {stats.unread} unread
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2"
            >
              <MdMarkEmailRead className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClearRead}
            className="flex items-center gap-2"
          >
            <MdClearAll className="h-4 w-4" />
            Clear Read
          </Button>
          <Button
            variant="outline"
            onClick={handleClearAll}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <MdDelete className="h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <MdNotifications className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{stats.unread}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600">{stats.byType.error || 0}</p>
            </div>
            <MdError className="h-8 w-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success</p>
              <p className="text-2xl font-bold text-green-600">{stats.byType.success || 0}</p>
            </div>
            <MdCheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </Card>
      </div>

      {/* Notifications List */}
      <Card className="overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <MdNotifications className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're all caught up! No notifications to show.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium ${
                        !notification.read 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      !notification.read 
                        ? 'text-gray-700 dark:text-gray-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      <MdDelete className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
