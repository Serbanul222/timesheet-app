'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

// This is like an authentication interceptor in Java - checks if user has access
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/login',
  requireAuth = true
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) return

    // If authentication is required but user is not logged in
    if (requireAuth && !user) {
      router.push(redirectTo)
      return
    }

    // If authentication is NOT required but user IS logged in (like login page)
    if (!requireAuth && user) {
      router.push('/dashboard')
      return
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // If requiring auth but no user, don't render children (redirect will happen)
  if (requireAuth && !user) {
    return null
  }

  // If not requiring auth but user exists, don't render children (redirect will happen)
  if (!requireAuth && user) {
    return null
  }

  // All checks passed, render the protected content
  return <>{children}</>
} 
