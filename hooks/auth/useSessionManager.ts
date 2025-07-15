'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface SessionState {
  isActive: boolean
  timeLeft: number // in seconds
  showWarning: boolean
  isExpired: boolean
}

interface SessionManagerActions {
  resetSession: () => void
  extendSession: () => void
  forceLogout: () => void
}

const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000 // 5 minutes before expiration
const CHECK_INTERVAL = 10000 // Check every 10 seconds (reduced frequency)

export function useSessionManager(): SessionState & SessionManagerActions {
  const router = useRouter()
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    timeLeft: 0,
    showWarning: false,
    isExpired: false
  })

  // Use refs to store timer values to avoid stale closures
  const sessionStartTime = useRef<number>(0)
  const checkIntervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef(false)
  const isInitializedRef = useRef(false)

  // Reset session timer
  const resetSession = useCallback(() => {
    console.log('SessionManager: Resetting session timer')
    sessionStartTime.current = Date.now()
    warningShownRef.current = false
    isInitializedRef.current = true
    setSessionState(prev => ({
      ...prev,
      isActive: true,
      timeLeft: SESSION_DURATION / 1000,
      showWarning: false,
      isExpired: false
    }))
  }, [])

  // Extend session (when user is active)
  const extendSession = useCallback(() => {
    console.log('SessionManager: Extending session')
    resetSession()
    toast.success('Session extended', {
      description: 'Your session has been extended for another 30 minutes'
    })
  }, [resetSession])

  // Force logout
  const forceLogout = useCallback(async () => {
    console.log('SessionManager: Forcing logout')
    
    // Clear all timers
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
    }
    
    // Clear session state
    setSessionState({
      isActive: false,
      timeLeft: 0,
      showWarning: false,
      isExpired: true
    })
    
    isInitializedRef.current = false
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('SessionManager: Error signing out:', error)
    }
    
    // Clear any stored tokens/data
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login
    router.push('/login')
  }, [router])

  // Check session validity and time left
  const checkSession = useCallback(() => {
    if (!sessionStartTime.current || !isInitializedRef.current) return

    const elapsed = Date.now() - sessionStartTime.current
    const timeLeft = Math.max(0, SESSION_DURATION - elapsed)
    const timeLeftSeconds = Math.floor(timeLeft / 1000)

    // Session expired
    if (timeLeft <= 0) {
      console.log('SessionManager: Session expired')
      setSessionState(prev => ({
        ...prev,
        isActive: false,
        timeLeft: 0,
        showWarning: false,
        isExpired: true
      }))
      
      toast.error('Session expired', {
        description: 'Your session has expired. Please sign in again.',
        duration: 5000
      })
      
      forceLogout()
      return
    }

    // Show warning 5 minutes before expiration
    if (timeLeft <= WARNING_TIME && !warningShownRef.current) {
      console.log('SessionManager: Showing session warning')
      warningShownRef.current = true
      
      setSessionState(prev => ({
        ...prev,
        showWarning: true,
        timeLeft: timeLeftSeconds
      }))
      
      toast.warning('Session expiring soon', {
        description: `Your session will expire in ${Math.floor(timeLeft / 60000)} minutes. Click to extend.`,
        duration: 10000,
        action: {
          label: 'Extend Session',
          onClick: extendSession
        }
      })
    } else {
      // Update time left
      setSessionState(prev => ({
        ...prev,
        timeLeft: timeLeftSeconds,
        showWarning: timeLeft <= WARNING_TIME
      }))
    }
  }, [forceLogout, extendSession])

  // Start session monitoring - but only when initialized
  useEffect(() => {
    if (!isInitializedRef.current) {
      return
    }

    console.log('SessionManager: Starting session monitoring')
    
    // Start the interval
    checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL)
    
    // Activity listeners to extend session (simplified)
    const activityEvents = ['click', 'keypress', 'scroll']
    let lastActivity = Date.now()
    
    const handleActivity = () => {
      const now = Date.now()
      // Only reset if more than 5 minutes has passed since last activity
      if (now - lastActivity > 5 * 60 * 1000) {
        lastActivity = now
        if (sessionState.isActive) {
          resetSession()
        }
      }
    }
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [checkSession, resetSession, sessionState.isActive])

  return {
    ...sessionState,
    resetSession,
    extendSession,
    forceLogout
  }
}