// app/api/admin/users/route.ts - REVISED: Robust client initialization for Next.js App Router

import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

// Explicitly mark this route as dynamic. This is a key step.
export const dynamic = 'force-dynamic'

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
  // ✅ FIXED: This is the official recommended pattern for Route Handlers.
  // 1. Get the cookieStore within the async handler.
  const cookieStore = cookies()
  // 2. Pass a function that returns the cookieStore to the client.
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  })

  try {
    console.log('🔍 Admin Users API called')
    
    // First, verify the requesting user is HR using the regular client
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user is HR using the service role client
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

    // Get all profiles using the service role client
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
    for (const p of profiles || []) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(p.id)
        
        const authUser = authData.user
        const hasAuthAccount = !authError && !!authUser
        
        const hasCompletedSetup = hasAuthAccount && 
                                 !!authUser?.email_confirmed_at && 
                                 !!authUser?.last_sign_in_at

        const isPendingSetup = hasAuthAccount && !hasCompletedSetup
        
        usersWithAuthStatus.push({
          ...p,
          auth_status: {
            exists: hasAuthAccount,
            email_confirmed: !!authUser?.email_confirmed_at,
            last_sign_in_at: authUser?.last_sign_in_at || null,
            has_completed_setup: hasCompletedSetup,
            is_pending_setup: isPendingSetup,
            account_created_at: authUser?.created_at || null
          }
        })
        
        console.log(`✅ Processed user: ${p.email} - Setup: ${hasCompletedSetup}`)
      } catch (error) {
        console.log(`❌ Error checking auth for ${p.email}:`, error)
        usersWithAuthStatus.push({
          ...p,
          auth_status: { 
            exists: false, 
            email_confirmed: false, 
            last_sign_in_at: null,
            has_completed_setup: false,
            is_pending_setup: false,
            account_created_at: null
          }
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