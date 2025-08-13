// Replace your existing file with this corrected version

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// Use service role for admin operations
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

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('🔄 API: Reset password requested for user ID:', params.userId)

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: requestingUser, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || requestingUser?.role !== 'HR') {
      console.log('❌ API: Non-HR user attempting reset:', session.user.email)
      return NextResponse.json(
        { error: 'HR role required' },
        { status: 403 }
      )
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', params.userId)
      .single()

    if (targetError || !targetProfile) {
      console.error('❌ API: Target user profile not found:', targetError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    console.log('✅ API: Target user found:', targetProfile.email)

    // ✅ FIX: Use the correct function resetPasswordForEmail on the auth client
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      targetProfile.email,
      {
        redirectTo: `${request.nextUrl.origin}/auth/reset-password`,
      }
    )

    if (resetError) {
      console.error('❌ API: Failed to send reset email:', resetError)
      return NextResponse.json(
        { error: 'Failed to send reset email: ' + resetError.message },
        { status: 500 }
      )
    }

    console.log('✅ API: Password reset email sent to:', targetProfile.email)

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
      email: targetProfile.email
    })

  } catch (error) {
    console.error('💥 API: Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}