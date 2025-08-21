// /api/admin/profiles/route.ts

import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

// ============================================================================
// Supabase Admin Client
// ============================================================================
// This client uses the SERVICE_ROLE_KEY to bypass Row Level Security.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// ============================================================================
// Validation Helpers
// ============================================================================
const createProfileSchema = {
    email: (value: any) => {
      if (!value || typeof value !== 'string') return 'Email is required.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Invalid email format.';
      return null;
    },
    full_name: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim().length < 2) {
        return 'Full name must be at least 2 characters.';
      }
      return null;
    },
    role: (value: any) => {
      if (!['HR', 'ASM', 'STORE_MANAGER'].includes(value)) return 'Invalid role selected.';
      return null;
    },
    zone_id: (value: any, data: { role: string }) => {
      if (data.role === 'ASM' && !value) return 'Zone is required for an ASM role.';
      return null;
    },
    store_id: (value: any, data: { role: string }) => {
      if (data.role === 'STORE_MANAGER' && !value) return 'Store is required for a Store Manager role.';
      return null;
    },
};

function validateData(data: any, schema: Record<string, Function>) {
    const errors: Record<string, string> = {};
    for (const [field, validator] of Object.entries(schema)) {
        const error = validator(data[field], data);
        if (error) {
        errors[field] = error;
        }
    }
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}


// ============================================================================
// GET /api/admin/profiles - Fetches all profiles with auth status
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: No active session.' }, { status: 401 });
    }

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).single();
    if (adminProfile?.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden: HR access required.' }, { status: 403 });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, zone_id, store_id, created_at, zone:zones(id, name), store:stores(id, name)')
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('❌ GET Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles.', details: profilesError.message }, { status: 500 });
    }
    
    const profilesWithAuthStatus = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          
          if (authError || !authData.user) throw new Error('Auth user not found');

          const user = authData.user;
          const isConfirmed = !!user.email_confirmed_at;
          const hasCompletedSetup = isConfirmed && !!user.last_sign_in_at;
          
          return {
            ...profile,
            auth_status: {
              exists: true,
              email_confirmed: isConfirmed,
              last_sign_in_at: user.last_sign_in_at,
              has_completed_setup: hasCompletedSetup,
              is_pending_setup: !hasCompletedSetup,
              account_created_at: user.created_at,
            },
          };
        } catch (error) {
          // This handles profiles that have no matching auth user.
          return {
            ...profile,
            auth_status: {
              exists: false,
              email_confirmed: false,
              last_sign_in_at: null,
              has_completed_setup: false,
              is_pending_setup: false,
              account_created_at: null,
            },
          };
        }
      })
    );

    return NextResponse.json({ profiles: profilesWithAuthStatus });

  } catch (error) {
    console.error('❌ GET /api/admin/profiles uncaught error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}


// ============================================================================
// POST /api/admin/profiles - Creates user and sends password set invitation
// ============================================================================
export async function POST(request: NextRequest) {
  let newAuthUserId: string | null = null;

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Step 1: Verify HR Admin permissions
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: No active session.' }, { status: 401 });
    }

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', session.user.id).single();
    if (adminProfile?.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden: HR access required.' }, { status: 403 });
    }

    // Step 2: Validate request body
    const body = await request.json();
    const validation = validateData(body, createProfileSchema);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Validation failed.', details: validation.errors }, { status: 400 });
    }

    // ✅ Step 3: Invite Auth User via Email to set their password.
    // This replaces `createUser` to handle the invitation flow automatically.
    const email = body.email.trim().toLowerCase();
    const { data: authUserResponse, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          // IMPORTANT: Ensure NEXT_PUBLIC_BASE_URL is set in your .env.local file
          // e.g., NEXT_PUBLIC_BASE_URL=http://localhost:3000
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/set-password`,
          data: { 
            full_name: body.full_name.trim(), 
            role: body.role 
          }, // This metadata is available on the user object
        }
    );

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already in use.', details: { email: 'A user with this email is already registered.' } }, { status: 409 });
      }
      console.error('❌ POST Error inviting user:', authError);
      return NextResponse.json({ error: 'Failed to send user invitation.', details: authError.message }, { status: 500 });
    }

    if (!authUserResponse.user) {
      return NextResponse.json({ error: 'User could not be created from invitation.' }, { status: 500 });
    }

    newAuthUserId = authUserResponse.user.id;

    // Step 4: Use UPSERT to update the profile created by your database trigger.
    const profileData = {
      id: newAuthUserId, // This matches the record created by the trigger
      email: email,
      full_name: body.full_name.trim(),
      role: body.role,
      zone_id: body.zone_id || null,
      store_id: body.store_id || null,
    };
    
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select('*, zone:zones(id, name), store:stores(id, name)')
      .single();

    if (profileError) {
      // If this fails, the cleanup logic will delete the orphaned auth user.
      throw profileError;
    }

    // Step 5: Success - return the fully updated profile with correct initial status
    const responsePayload = {
        ...updatedProfile,
        auth_status: {
            exists: true,
            email_confirmed: false, // Email is not confirmed until they set their password
            last_sign_in_at: null,
            has_completed_setup: false,
            is_pending_setup: true, // User is now pending setup
            account_created_at: authUserResponse.user.created_at,
        }
    };

    return NextResponse.json({ success: true, profile: responsePayload, message: 'Invitation sent and profile created.' }, { status: 201 });

  } catch (error: any) {
    // Critical cleanup logic: If profile creation fails, delete the invited auth user.
    if (newAuthUserId) {
      console.log(`🧹 Cleaning up orphaned auth user due to error: ${newAuthUserId}`);
      await supabaseAdmin.auth.admin.deleteUser(newAuthUserId);
    }
    
    console.error('❌ POST /api/admin/profiles transaction failed:', error);

    if (error.code === '23505') {
      return NextResponse.json({ error: 'A profile with this email already exists.', details: { email: 'The email address is already tied to a profile.' } }, { status: 409 });
    }
    
    if (error.code === '23503') { // Foreign key violation
      const detail = error.details || '';
      const field = detail.includes('zone_id') ? 'zone_id' : 'store_id';
      return NextResponse.json({ error: 'Invalid reference data provided.', details: { [field]: `The selected ${field.replace('_id', '')} does not exist.` } }, { status: 400 });
    }

    return NextResponse.json({ error: 'An internal error occurred during profile creation.', details: error.message }, { status: 500 });
  }
}