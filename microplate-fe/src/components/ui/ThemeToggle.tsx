import { useTheme } from '../../contexts/ThemeContext'
import { MdDarkMode, MdLightMode, MdSettings } from 'react-icons/md'

interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ThemeToggle({ 
  className = '', 
  showLabels = false, 
  size = 'md' 
}: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme()

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <MdLightMode className={iconSizes[size]} />
      case 'dark':
        return <MdDarkMode className={iconSizes[size]} />
      case 'system':
        return <MdSettings className={iconSizes[size]} />
      default:
        return <MdSettings className={iconSizes[size]} />
    }
  }

  const getTooltip = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode'
      case 'dark':
        return 'Switch to system theme'
      case 'system':
        return 'Switch to light mode'
      default:
        return 'Toggle theme'
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'Theme'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleTheme}
        title={getTooltip()}
        className={`
          ${sizeClasses[size]}
          rounded-full bg-gray-200 dark:bg-gray-700 
          text-gray-700 dark:text-gray-200 
          hover:text-gray-900 dark:hover:text-white
          hover:bg-gray-300 dark:hover:bg-gray-600
          transition-all duration-200 ease-in-out
          flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          active:scale-95
        `}
      >
        {getIcon()}
      </button>
      
      {showLabels && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getLabel()}
        </span>
      )}
      
      {theme === 'system' && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({actualTheme})
        </span>
      )}
    </div>
  )
}

// Alternative dropdown-style theme selector
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { theme, setTheme, actualTheme } = useTheme()

  const themes = [
    { value: 'light', label: 'Light', icon: MdLightMode, description: 'Light theme' },
    { value: 'dark', label: 'Dark', icon: MdDarkMode, description: 'Dark theme' },
    { value: 'system', label: 'System', icon: MdSettings, description: 'Follow system preference' }
  ] as const

  return (
    <div className={`relative ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {themes.map(({ value, label, icon: Icon, description }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={description}
            className={`
              p-3 rounded-lg border-2 transition-all duration-200
              flex flex-col items-center gap-2
              ${theme === value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
            {value === 'system' && (
              <span className="text-xs opacity-75">({actualTheme})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
