import { NavLink, useNavigate } from 'react-router-dom';
import { MdLogout, MdSettings, MdDashboard, MdScience, MdDescription, MdPerson, MdExpandMore, MdNotifications, MdSearch, MdClose, MdAccessTime, MdDelete, MdMarkEmailRead, MdClearAll, MdHelp } from 'react-icons/md';
import { useEffect, useState } from 'react';
import { authService } from '../../services/auth.service';
import { notificationService } from '../../services/notification.service';
import type { Notification } from '../../services/notification.service';
import { searchService } from '../../services/search.service';
import type { SearchResult } from '../../services/search.service';

const navigationLinks = [
  { name: 'Dashboard', href: '/capture', icon: MdDashboard },
  { name: 'Results', href: '/results', icon: MdScience },
  { name: 'User Guide', href: '/user-guide', icon: MdHelp },
];

// const userNavigation = [
//   { name: 'Your Profile', href: '/settings' },
//   { name: 'Sign out', href: '#' },
// ];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const navigate = useNavigate();
  
  const handleSignOut = () => {
    authService.logout();
    window.location.href = '/auth';
  };

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleDeleteNotification = (id: string) => {
    notificationService.deleteNotification(id);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      notificationService.clearNotifications();
    }
  };

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  // User info from token
  const [userInfo, setUserInfo] = useState<{ email?: string; username?: string }>({});
  
  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Load user info from token
  useEffect(() => {
    const token = authService.getCurrentToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          email: payload.email || payload.sub,
          username: payload.username || payload.name
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  // Load notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notifications) => {
      setNotifications(notifications);
      setUnreadCount(notificationService.getUnreadCount());
    });

    return unsubscribe;
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        try {
          const response = await searchService.search(searchQuery);
          setSearchResults(response.data.results);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen && !(event.target as Element).closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
      if (isNotificationsOpen && !(event.target as Element).closest('.notifications-dropdown')) {
        setIsNotificationsOpen(false);
      }
      if (isSearchOpen && !(event.target as Element).closest('.search-dropdown')) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, isNotificationsOpen, isSearchOpen]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="container-page">
        <div className="flex h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img 
                src="/HAIlytics.png" 
                alt="HAIlytics Logo" 
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">HAIlytics</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Analytics-first HI</span>
              </div>
            </div>
          </div>

          {/* Centered navigation */}
          <nav className="flex-1 hidden md:flex justify-center">
            <div className="flex items-baseline space-x-4">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    classNames(
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right actions */}
          <div className="ml-4 flex items-center gap-3">
            {/* Search */}
            <div className="relative search-dropdown">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Search"
              >
                <MdSearch className="h-5 w-5" />
              </button>

              {/* Search dropdown */}
              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-gray-700">
                  <div className="p-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search samples, results, logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pl-10 pr-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                      />
                      <MdSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          <MdClose />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isSearching && (
                    <div className="px-4 pb-4">
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Searching...
                      </div>
                    </div>
                  )}
                  
                  {searchQuery && !isSearching && (
                    <div className="max-h-64 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <NavLink
                            key={result.id}
                            to={result.url}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex-shrink-0">
                              {result.type === 'sample' && <MdScience className="h-4 w-4 text-blue-500" />}
                              {result.type === 'result' && <MdDescription className="h-4 w-4 text-green-500" />}
                              {result.type === 'log' && <MdAccessTime className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </div>
                            </div>
                          </NavLink>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No results found for "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!searchQuery && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Start typing to search...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative notifications-dropdown">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Notifications"
              >
                <MdNotifications className="h-5 w-5" />
                {/* Notification badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      <div className="flex gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAllAsRead();
                            }}
                            className="p-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Mark all as read"
                          >
                            <MdMarkEmailRead className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAll();
                          }}
                          className="p-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Clear all"
                        >
                          <MdClearAll className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              notification.type === 'error' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                handleMarkAsRead(notification.id);
                                if (notification.actionUrl) {
                                  window.location.href = notification.actionUrl;
                                }
                              }}
                            >
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {new Date(notification.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="p-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Mark as read"
                                >
                                  <MdMarkEmailRead className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="p-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <MdDelete className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/notifications');
                      }}
                      className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Version Info removed as requested */}

            {/* Profile dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <MdPerson className="h-5 w-5 text-white" />
                </div>
                <MdExpandMore className={`h-4 w-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-gray-700">
                  <div className="py-2">
                    {/* Profile info */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                          <MdPerson className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {userInfo.username || 'User Profile'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userInfo.email || 'user@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Profile link */}
                    <NavLink
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <MdPerson className="h-4 w-4" />
                      Profile
                    </NavLink>
                    
                    {/* Settings link */}
                    <NavLink
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <MdSettings className="h-4 w-4" />
                      Settings
                    </NavLink>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    
                    {/* Logout */}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <MdLogout className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
