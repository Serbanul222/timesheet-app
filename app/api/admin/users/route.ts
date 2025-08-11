// Replace your app/api/admin/users/route.ts with this version:

import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

// Service role client for bypassing RLS
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin Users API called')
    
    // First, verify the requesting user is HR using regular client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user is HR using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || profile?.role !== 'HR') {
      console.log('❌ Not HR role:', profile?.role)
      return NextResponse.json({ error: 'Forbidden - HR access required' }, { status: 403 })
    }

    console.log('✅ HR user verified, fetching all profiles')

    // Get all profiles using service role
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    console.log(`📊 Found ${profiles?.length || 0} profiles`)

    // Check auth status for each profile
    const usersWithAuthStatus = []
    for (const profile of profiles || []) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        
        usersWithAuthStatus.push({
          ...profile,
          auth_status: {
            exists: !authError && !!authData.user,
            email_confirmed: !!authData.user?.email_confirmed_at,
            last_sign_in_at: authData.user?.last_sign_in_at,
            has_password: !!(authData.user as any)?.encrypted_password
          }
        })
        
        console.log(`✅ Processed user: ${profile.email}`)
      } catch (error) {
        console.log(`❌ Error checking auth for ${profile.email}:`, error)
        usersWithAuthStatus.push({
          ...profile,
          auth_status: { exists: false, email_confirmed: false, last_sign_in_at: null, has_password: false }
        })
      }
    }

    console.log(`🎉 Returning ${usersWithAuthStatus.length} users with auth status`)
    return NextResponse.json({ users: usersWithAuthStatus })

  } catch (error) {
    console.error('💥 Admin users API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}