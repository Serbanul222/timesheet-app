// components/auth/ProtectedRoute.tsx - SIMPLIFIED (no redirect logic)
'use client'

import { useEffect, useState } from 'react'
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
  const { user, loading, error } = useAuth()
  const [debugInfo, setDebugInfo] = useState<string[]>([])

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

  // Show loading state
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
                onClick={() => window.location.href = '/login'}
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

  // ✅ SIMPLIFIED: Just check auth requirements, let middleware handle redirects
  const shouldShowContent = requireAuth ? !!user : true

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // All checks passed, render the protected content
  console.log('ProtectedRoute: Rendering children')
  return <>{children}</>
}