'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/login',
  requireAuth = true
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, error } = useAuth()
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null)

  // Debug logging
  useEffect(() => {
    const info = [
      `Loading: ${loading}`,
      `User: ${user ? 'exists' : 'null'}`,
      `Error: ${error || 'none'}`,
      `RequireAuth: ${requireAuth}`,
      `Time: ${new Date().toLocaleTimeString()}`
    ]
    setDebugInfo(info)
    console.log('ProtectedRoute Debug:', info)
  }, [user, loading, error, requireAuth])

  // Handle redirects in useEffect to avoid render-time state updates
  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return

    // If requiring auth but no user, redirect to login
    if (requireAuth && !user && !error) {
      console.log('ProtectedRoute: Need to redirect to login - no user')
      setShouldRedirect(redirectTo)
      return
    }

    // If not requiring auth but user exists, redirect to dashboard
    if (!requireAuth && user) {
      console.log('ProtectedRoute: Need to redirect to dashboard - user exists')
      setShouldRedirect('/dashboard')
      return
    }

    // Clear any pending redirect
    setShouldRedirect(null)
  }, [user, loading, error, requireAuth, redirectTo])

  // Execute redirects in a separate useEffect
  useEffect(() => {
    if (shouldRedirect) {
      console.log('ProtectedRoute: Executing redirect to:', shouldRedirect)
      router.push(shouldRedirect)
    }
  }, [shouldRedirect, router])

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('ProtectedRoute: Taking too long, forcing redirect')
        if (requireAuth && !user) {
          setShouldRedirect(redirectTo)
        }
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [user, loading, requireAuth, redirectTo])

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
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-sm font-medium text-gray-800 mb-2">Debug Info:</p>
                {debugInfo.map((info, index) => (
                  <p key={index} className="text-xs text-gray-600">{info}</p>
                ))}
                {shouldRedirect && (
                  <p className="text-xs text-blue-600">Redirecting to: {shouldRedirect}</p>
                )}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">Authentication Error</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If we're pending a redirect, show loading
  if (shouldRedirect) {
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