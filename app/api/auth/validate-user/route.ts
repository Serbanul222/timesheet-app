// Replace your app/api/auth/validate-user/route.ts with this version:

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

// Use service role for bypassing RLS
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API: validate-user called (using service role)')
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { email } = body
    
    if (!email) {
      console.log('❌ No email provided')
      return NextResponse.json({ exists: false, error: 'Email is required' })
    }

    console.log('📧 Validating email:', email)
    
    // Query using service role (bypasses RLS)
    console.log('🔍 Querying profiles for email:', email)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .limit(1)

    console.log('📊 Query result:', { profiles, error })
    console.log('📊 Profiles count:', profiles?.length || 0)

    if (error) {
      console.error('❌ Database query error:', error)
      return NextResponse.json({ 
        exists: false, 
        error: 'Database query failed: ' + error.message 
      })
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found for email:', email)
      return NextResponse.json({ 
        exists: false, 
        error: 'User not found in profiles table' 
      })
    }

    const profile = profiles[0]
    console.log('✅ Profile found:', profile)

    return NextResponse.json({ 
      exists: true, 
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role
      }
    })

  } catch (error) {
    console.error('💥 API Error:', error)
    return NextResponse.json({ 
      exists: false, 
      error: 'API failed: ' + (error as Error).message 
    }, { status: 500 })
  }
}