// hooks/auth/useAuth.ts - Fixed to prevent infinite loops and 429 errors
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  clearError: () => void
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null
  })

  // ✅ FIX: Use refs to prevent infinite loops
  const isInitialized = useRef(false)
  const isSigningIn = useRef(false)
  const profileCache = useRef<{ [userId: string]: Profile }>({})

  // ✅ FIX: Memoized profile fetcher with caching
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Check cache first
    if (profileCache.current[userId]) {
      console.log('useAuth: Using cached profile for:', userId)
      return profileCache.current[userId]
    }

    try {
      console.log('useAuth: Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('useAuth: Profile fetch error:', error)
        return null
      }

      if (!data) {
        console.log('useAuth: No profile found, creating basic profile...')
        const newProfile = await createBasicProfile(userId)
        if (newProfile) {
          profileCache.current[userId] = newProfile
        }
        return newProfile
      }

      console.log('useAuth: Profile fetched successfully')
      // Cache the profile
      profileCache.current[userId] = data
      return data
    } catch (err) {
      console.error('useAuth: Profile fetch failed:', err)
      return null
    }
  }, [])

  // ✅ FIX: Memoized profile creation
  const createBasicProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('useAuth: Creating basic profile...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('useAuth: No user for profile creation')
        return null
      }

      const profileData = {
        id: userId,
        email: user.email || '',
        full_name: user.email?.split('@')[0] || 'User',
        role: 'STORE_MANAGER' as const,
        zone_id: null,
        store_id: null,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) {
        console.error('useAuth: Profile creation error:', error)
        return null
      }

      console.log('useAuth: Profile created successfully')
      return data
    } catch (err) {
      console.error('useAuth: Profile creation failed:', err)
      return null
    }
  }, [])

  // ✅ FIX: Initialize auth state only once
  useEffect(() => {
    if (isInitialized.current) return
    
    console.log('useAuth: Initializing...')
    isInitialized.current = true
    
    // Set a maximum loading time
    const loadingTimeout = setTimeout(() => {
      console.warn('useAuth: Loading timeout reached')
      setState(prev => ({ ...prev, loading: false, error: 'Authentication timeout' }))
    }, 10000)

    const getInitialSession = async () => {
      try {
        console.log('useAuth: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('useAuth: Session error:', error)
          setState(prev => ({ ...prev, error: error.message, loading: false }))
          clearTimeout(loadingTimeout)
          return
        }

        if (session?.user) {
          console.log('useAuth: User found, fetching profile...')
          const profile = await fetchUserProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null
          })
        } else {
          console.log('useAuth: No session found')
          setState(prev => ({ ...prev, loading: false }))
        }
        
        clearTimeout(loadingTimeout)
      } catch (err) {
        console.error('useAuth: Initialization error:', err)
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize authentication', 
          loading: false 
        }))
        clearTimeout(loadingTimeout)
      }
    }

    getInitialSession()

    // ✅ FIX: Set up auth listener with proper cleanup
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event, !!session)
        
        // Prevent processing during sign-in to avoid loops
        if (isSigningIn.current && event === 'SIGNED_IN') {
          console.log('useAuth: Skipping auth state change during sign in')
          return
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('useAuth: User signed in, fetching profile...')
          const profile = await fetchUserProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null
          })
        } else if (event === 'SIGNED_OUT') {
          console.log('useAuth: User signed out')
          profileCache.current = {} // Clear cache
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  // ✅ FIX: Improved sign in with better error handling
  const signIn = useCallback(async (email: string, password: string) => {
    if (isSigningIn.current) {
      console.log('useAuth: Sign in already in progress')
      return { error: 'Sign in already in progress' }
    }

    console.log('useAuth: Attempting sign in...')
    isSigningIn.current = true
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('useAuth: Sign in error:', error)
        setState(prev => ({ ...prev, error: error.message, loading: false }))
        return { error: error.message }
      }

      if (data.user) {
        console.log('useAuth: Sign in successful, fetching profile...')
        const profile = await fetchUserProfile(data.user.id)
        setState({
          user: data.user,
          profile,
          session: data.session,
          loading: false,
          error: null
        })
      }

      console.log('useAuth: Sign in successful')
      return {}
    } catch (err) {
      console.error('useAuth: Sign in failed:', err)
      const message = 'An unexpected error occurred during sign in'
      setState(prev => ({ ...prev, error: message, loading: false }))
      return { error: message }
    } finally {
      isSigningIn.current = false
    }
  }, [fetchUserProfile])

  // ✅ FIX: Improved sign out
  const signOut = useCallback(async () => {
    console.log('useAuth: Signing out...')
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('useAuth: Sign out error:', error)
        setState(prev => ({ ...prev, error: error.message, loading: false }))
        return
      }
      
      // Clear cache
      profileCache.current = {}
      
      // State will be cleared by the auth state change listener
      console.log('useAuth: Sign out successful')
    } catch (err) {
      console.error('useAuth: Sign out failed:', err)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to sign out', 
        loading: false 
      }))
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    signIn,
    signOut,
    clearError
  }
}