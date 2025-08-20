'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { SetPasswordForm } from '@/components/auth/SetPasswordForm'

// Extract the component that uses useSearchParams into a separate component
function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{url: string, hash: string} | null>(null)

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log('🔐 Reset page: Starting password reset flow')
        
        // ✅ FIXED: Set debug info safely on client side only
        if (typeof window !== 'undefined') {
          setDebugInfo({
            url: window.location.href,
            hash: window.location.hash
          })
          console.log('🔍 Current URL:', window.location.href)
        }
        
        // Method 1: Check for URL parameters (code-based flow)
        const code = searchParams.get('code')
        const error_code = searchParams.get('error_code')
        const error_description = searchParams.get('error_description')

        console.log('🔍 Reset page: URL params:', { code: !!code, error_code, error_description })

        // Handle error in URL
        if (error_code || error_description) {
          setError(error_description || 'Invalid reset link')
          return
        }

        // Method 1: If we have a code parameter, exchange it for a session
        if (code) {
          console.log('🔄 Reset page: Found code parameter, exchanging for session')
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('❌ Reset page: Code exchange error:', exchangeError)
            setError('Invalid or expired reset link')
            return
          }

          if (!data.user) {
            console.log('❌ Reset page: No user after code exchange')
            setError('Invalid reset link')
            return
          }

          console.log('✅ Reset page: Code exchange successful')
          
          // ✅ FIXED: Clean URL safely on client side only
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, '/auth/reset-password')
          }

          // Verify user exists in our database
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', data.user.id)
            .single()

          if (profileError || !profile) {
            console.error('❌ Reset page: Profile verification failed:', profileError)
            setError('User not authorized. Please contact your administrator.')
            return
          }

          console.log('✅ Reset page: Profile verified:', profile.email)
          setUserEmail(profile.email)
          return
        }

        // Method 2: Check for URL fragments (hash-based tokens) - CLIENT SIDE ONLY
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')

          console.log('🔍 Reset page: Hash params:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken, 
            type 
          })

          if (accessToken && refreshToken && type === 'recovery') {
            console.log('🔄 Reset page: Found hash tokens, setting session')
            
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (sessionError) {
              console.error('❌ Reset page: Session error:', sessionError)
              setError('Invalid or expired reset link')
              return
            }

            if (!data.user) {
              setError('Invalid reset link')
              return
            }

            // Clean the URL
            window.history.replaceState({}, document.title, '/auth/reset-password')

            // Verify user exists in our database
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', data.user.id)
              .single()

            if (profileError || !profile) {
              console.error('❌ Reset page: Profile verification failed:', profileError)
              setError('User not authorized. Please contact your administrator.')
              return
            }

            console.log('✅ Reset page: Profile verified:', profile.email)
            setUserEmail(profile.email)
            return
          }
        }

        // Method 3: Fallback - Check existing session
        console.log('🔍 Reset page: No URL tokens found, checking existing session')
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        if (getSessionError) {
          console.error('❌ Reset page: Session check error:', getSessionError)
          setError('Invalid or expired reset link')
          return
        }

        if (!session?.user) {
          console.log('❌ Reset page: No session found')
          setError('No active session. Please request a new password reset.')
          return
        }

        // Verify user exists in our database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', session.user.id)
          .single()

        if (profileError || !profile) {
          console.error('❌ Reset page: Profile verification failed:', profileError)
          setError('User not authorized. Please contact your administrator.')
          return
        }

        console.log('✅ Reset page: Session verified:', profile.email)
        setUserEmail(profile.email)

      } catch (err) {
        console.error('💥 Reset page: Unexpected error:', err)
        setError('An error occurred. Please try requesting a new reset link.')
      } finally {
        setIsLoading(false)
      }
    }

    handlePasswordReset()
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
          
          {/* ✅ FIXED: Debug info with SSR safety */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left max-w-md mx-auto">
              <p className="text-sm font-medium text-gray-800 mb-2">Debug Info:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>URL: {debugInfo.url}</p>
                <p>Code param: {searchParams.get('code') ? 'Yes' : 'No'}</p>
                <p>Hash: {debugInfo.hash}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Reset Link Invalid</h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 px-4">
        <SetPasswordForm 
          email={userEmail!} 
          onSuccess={() => {
            // Sign out after password change to force fresh login
            supabase.auth.signOut().then(() => {
              router.push('/login')
            })
          }}
        />
      </div>
    </div>
  )
}

// Loading fallback component
function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Încărcare...</p>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  )
}