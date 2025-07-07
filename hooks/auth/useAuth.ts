'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    console.log('useAuth: Initializing...')
    
    // Set a maximum loading time
    const loadingTimeout = setTimeout(() => {
      console.warn('useAuth: Loading timeout reached, stopping loading state')
      setState(prev => ({ ...prev, loading: false, error: 'Authentication timeout' }))
    }, 8000)

    const getInitialSession = async () => {
      try {
        console.log('useAuth: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('useAuth: Session result:', { session: !!session, error })
        
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

    // Listen for auth changes
    console.log('useAuth: Setting up auth listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', event, !!session)
        
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
  }, [])

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
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
        return await createBasicProfile(userId)
      }

      console.log('useAuth: Profile fetched successfully:', data)
      return data
    } catch (err) {
      console.error('useAuth: Profile fetch failed:', err)
      return null
    }
  }

  const createBasicProfile = async (userId: string): Promise<Profile | null> => {
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

      console.log('useAuth: Profile created successfully:', data)
      return data
    } catch (err) {
      console.error('useAuth: Profile creation failed:', err)
      return null
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('useAuth: Attempting sign in...')
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

      console.log('useAuth: Sign in successful')
      // Profile will be fetched by the auth state change listener
      return {}
    } catch (err) {
      console.error('useAuth: Sign in failed:', err)
      const message = 'An unexpected error occurred during sign in'
      setState(prev => ({ ...prev, error: message, loading: false }))
      return { error: message }
    }
  }

  const signOut = async () => {
    console.log('useAuth: Signing out...')
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('useAuth: Sign out error:', error)
        setState(prev => ({ ...prev, error: error.message, loading: false }))
      }
      // State will be cleared by the auth state change listener
    } catch (err) {
      console.error('useAuth: Sign out failed:', err)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to sign out', 
        loading: false 
      }))
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  // Debug logging
  useEffect(() => {
    console.log('useAuth state:', {
      hasUser: !!state.user,
      hasProfile: !!state.profile,
      loading: state.loading,
      error: state.error
    })
  }, [state])

  return {
    ...state,
    signIn,
    signOut,
    clearError
  }
}