import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'

type Props = {
  children: React.ReactNode
}

export default function AuthGuard({ children }: Props) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('AuthGuard: Checking authentication...')
      // Load token from storage and set for all services
      const token = authService.loadTokenFromStorage()
      console.log('AuthGuard: Token present:', !!token)
      
      if (!token) {
        console.log('AuthGuard: No token, redirecting to auth')
        setIsAuthenticated(false)
        navigate('/auth', { replace: true })
        return
      }
      
      // Check if token is valid
      const isValid = authService.isTokenValid()
      console.log('AuthGuard: Token valid:', isValid)
      
      if (!isValid) {
        console.log('AuthGuard: Token invalid, trying to refresh...')
        // Try to refresh token if available
        try {
          await authService.refreshToken()
          console.log('AuthGuard: Token refreshed successfully')
          setIsAuthenticated(true)
        } catch (error) {
          console.log('AuthGuard: Token refresh failed, logging out')
          // Refresh failed, logout user
          authService.logout()
          setIsAuthenticated(false)
          navigate('/auth', { replace: true })
        }
        return
      }
      
      console.log('AuthGuard: Authentication successful')
      setIsAuthenticated(true)
    }

    checkAuth()
  }, [navigate])

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
