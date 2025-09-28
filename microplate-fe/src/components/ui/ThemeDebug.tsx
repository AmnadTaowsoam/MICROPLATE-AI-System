import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeDebug() {
  const { theme, actualTheme, isDark } = useTheme()

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-xs font-mono shadow-lg z-50">
      <div className="text-gray-900 dark:text-white">
        <div>Theme: {theme}</div>
        <div>Actual: {actualTheme}</div>
        <div>isDark: {isDark.toString()}</div>
        <div>DOM class: {document.documentElement.classList.contains('dark') ? 'dark' : 'light'}</div>
      </div>
    </div>
  )
}
