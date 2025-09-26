import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { authService } from '../../services/auth.service'

export default function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light')

  // Load theme on mount and sync with ProfileSettingsPage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  // Listen for theme changes from other components
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail
      if (newTheme !== theme) {
        setTheme(newTheme)
      }
    }
    
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme)
      }
    }
    
    window.addEventListener('themeChanged', handleThemeChange as EventListener)
    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }))
  }

  const handleLogout = () => {
    authService.logout()
    window.location.href = '/auth'
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container-page py-4 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">HAIlytics</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Analytics-first Hemagglutination Inhibition</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink 
            to="/capture" 
            className={({ isActive }) => 
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Capture
          </NavLink>
          <NavLink 
            to="/samples" 
            className={({ isActive }) => 
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Samples
          </NavLink>
          <NavLink 
            to="/results" 
            className={({ isActive }) => 
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Results
          </NavLink>
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>

          {/* Version */}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">v1.0.0</span>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Settings
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
