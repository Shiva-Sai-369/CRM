/**
 * POST /api/invite-team-member
 * super_admin only.
 * Body: { email: string, password: string }
 *
 * Creates a team_member account directly with password. No email sent.
 * New team_member starts with zero project assignments.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Authenticate caller
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization: super_admin only
  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
  }

  // Parse body
  let email: string;
  let password: string;
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      throw new Error('invalid email');
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
      throw new Error('password must be at least 8 characters');
    }
    email = body.email.trim().toLowerCase();
    password = body.password;
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Invalid request body. Expected { email: string, password: string }' 
    }, { status: 400 });
  }

  // Create user directly with Admin API (service role)
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      role: 'team_member',
      password_set: true
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    userId: data.user.id,
    email,
    password  // Return password so admin can copy it
  }, { status: 200 });
}
