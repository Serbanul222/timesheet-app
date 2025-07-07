import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing Supabase URL')
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  throw new Error('Missing Supabase anon key')
}

// Log configuration (without sensitive data)
console.log('Supabase client configuration:', {
  url: supabaseUrl.substring(0, 30) + '...',
  keyLength: supabaseAnonKey.length,
  environment: process.env.NODE_ENV
})

// Create the client with explicit configuration
export const supabase = createClientComponentClient<Database>({
  supabaseUrl,
  supabaseKey: supabaseAnonKey,
})

// Test function to verify connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase connection...')
    const startTime = Date.now()
    
    // Simple health check query with timeout
    const { error } = await Promise.race([
      supabase.from('profiles').select('count').limit(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 5s')), 5000)
      )
    ]) as any

    const duration = Date.now() - startTime
    console.log(`Supabase connection test completed in ${duration}ms`)

    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }

    console.log('Supabase connection test successful')
    return true
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return false
  }
}

// Test auth configuration
export const testAuthConfig = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase auth configuration...')
    const startTime = Date.now()
    
    const { error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout after 5s')), 5000)
      )
    ]) as any

    const duration = Date.now() - startTime
    console.log(`Auth configuration test completed in ${duration}ms`)

    if (error) {
      console.error('Auth configuration test failed:', error)
      return false
    }

    console.log('Auth configuration test successful')
    return true
  } catch (err) {
    console.error('Auth configuration test error:', err)
    return false
  }
}