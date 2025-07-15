import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Clear all stored authentication data
 */
export const clearAuthData = (): void => {
  console.log('AuthUtils: Clearing all auth data')
  
  // Clear localStorage and sessionStorage
  localStorage.clear()
  sessionStorage.clear()
}

/**
 * Check if session is actually valid with server
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('AuthUtils: Session validation failed:', error?.message)
      return false
    }
    
    // Additional check: try to fetch user profile to ensure DB connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      console.log('AuthUtils: Profile validation failed:', profileError?.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error('AuthUtils: Session validation error:', err)
    return false
  }
}

/**
 * Fetch user profile from database
 */
export const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    console.log('AuthUtils: Fetching profile for user:', userId)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('AuthUtils: Profile fetch error:', error)
      return null
    }

    if (!data) {
      console.log('AuthUtils: No profile found, creating basic profile...')
      return await createBasicProfile(userId)
    }

    console.log('AuthUtils: Profile fetched successfully')
    return data
  } catch (err) {
    console.error('AuthUtils: Profile fetch failed:', err)
    return null
  }
}

/**
 * Create a basic profile for new users
 */
export const createBasicProfile = async (userId: string): Promise<Profile | null> => {
  try {
    console.log('AuthUtils: Creating basic profile...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('AuthUtils: No user for profile creation')
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
      console.error('AuthUtils: Profile creation error:', error)
      return null
    }

    console.log('AuthUtils: Profile created successfully')
    return data
  } catch (err) {
    console.error('AuthUtils: Profile creation failed:', err)
    return null
  }
}