import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme
    return saved || 'system'
  })

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme') as Theme
    const currentTheme = saved || 'system'
    
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return currentTheme
  })

  useEffect(() => {
    const root = document.documentElement
    console.log('ThemeContext: Applying theme:', theme)
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const isDark = mediaQuery.matches
      
      console.log('ThemeContext: System theme, prefers dark:', isDark)
      
      const handleChange = (e: MediaQueryListEvent) => {
        console.log('ThemeContext: System preference changed:', e.matches)
        setActualTheme(e.matches ? 'dark' : 'light')
        root.classList.toggle('dark', e.matches)
      }
      
      // Set initial value
      setActualTheme(isDark ? 'dark' : 'light')
      root.classList.toggle('dark', isDark)
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange)
      
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      const isDark = theme === 'dark'
      console.log('ThemeContext: Manual theme:', theme, 'isDark:', isDark)
      
      setActualTheme(theme)
      root.classList.toggle('dark', isDark)
    }
    
    localStorage.setItem('theme', theme)
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }))
  }, [theme])

  const isDark = actualTheme === 'dark'

  const value: ThemeContextType = {
    theme,
    setTheme,
    actualTheme,
    isDark
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
