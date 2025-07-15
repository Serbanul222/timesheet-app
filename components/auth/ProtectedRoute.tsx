// components/auth/ProtectedRoute.tsx - Fixed with better redirect handling
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, error } = useAuth()
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [hasRedirected, setHasRedirected] = useState(false)

  // Debug logging
  useEffect(() => {
    const info = [
      `Loading: ${loading}`,
      `User: ${user ? 'exists' : 'null'}`,
      `Error: ${error || 'none'}`,
      `RequireAuth: ${requireAuth}`,
      `Pathname: ${pathname}`,
      `HasRedirected: ${hasRedirected}`,
      `Time: ${new Date().toLocaleTimeString()}`
    ]
    setDebugInfo(info)
    console.log('ProtectedRoute Debug:', info)
  }, [user, loading, error, requireAuth, pathname, hasRedirected])

  // Handle redirects when auth state is determined
  useEffect(() => {
    // Don't redirect while still loading or if already redirected
    if (loading || hasRedirected) return

    console.log('ProtectedRoute: Checking redirect conditions...', {
      requireAuth,
      hasUser: !!user,
      pathname,
      error
    })

    // If requiring auth but no user, redirect to login
    if (requireAuth && !user && !error) {
      console.log('ProtectedRoute: Redirecting to login - no user')
      setHasRedirected(true)
      const loginUrl = `/login?redirectTo=${encodeURIComponent(pathname)}`
      router.replace(loginUrl)
      return
    }

    // If not requiring auth but user exists, redirect to dashboard
    if (!requireAuth && user) {
      console.log('ProtectedRoute: Redirecting to dashboard - user exists')
      setHasRedirected(true)
      router.replace('/dashboard')
      return
    }
  }, [user, loading, error, requireAuth, pathname, hasRedirected, router])

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !hasRedirected) {
        console.warn('ProtectedRoute: Taking too long, forcing redirect')
        if (requireAuth && !user) {
          setHasRedirected(true)
          router.replace(`/login?redirectTo=${encodeURIComponent(pathname)}`)
        }
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [user, loading, requireAuth, pathname, hasRedirected, router])

  // Show loading state with debug info
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
            
            {/* Debug info in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left max-w-md">
                <p className="text-sm font-medium text-gray-800 mb-2">Debug Info:</p>
                {debugInfo.map((info, index) => (
                  <p key={index} className="text-xs text-gray-600">{info}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    )
  }

  // Handle errors
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={() => router.replace('/login')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Go to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If we're pending a redirect, show loading
  if (hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // If requiring auth but no user, show loading (redirect will happen via useEffect)
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not requiring auth but user exists, show loading (redirect will happen via useEffect)
  if (!requireAuth && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // All checks passed, render the protected content
  console.log('ProtectedRoute: Rendering children')
  return <>{children}</>
}