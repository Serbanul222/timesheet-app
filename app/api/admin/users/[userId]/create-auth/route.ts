// Replace your app/api/admin/users/[userId]/create-auth/route.ts with this:

import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ✅ FIXED: Await params for Next.js 15
    const { userId } = await params
    
    // ✅ FIXED: Await cookies for Next.js 15
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin user using service role
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (adminProfile?.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get target user profile using service role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ✅ FIXED: Use service role for creating user (consistent approach)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: profile.email,
      email_confirm: true,
      user_metadata: { profile_id: userId }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // ✅ FIXED: Use service role for password setup email
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`,
    })

    if (resetError) {
      console.error('Password setup email error:', resetError)
      // Don't fail the request if email sending fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Auth user created and setup email sent' 
    })
  } catch (error) {
    console.error('Create auth user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}