/**
 * POST /api/invite-team-member
 * super_admin only.
 * Body: { email: string }
 *
 * Sends a Supabase invite email with role: 'team_member' in metadata.
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
  try {
    const body = await request.json() as { email?: unknown };
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      throw new Error('invalid email');
    }
    email = body.email.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request body. Expected { email: string }' }, { status: 400 });
  }

  // Send invite via Admin API (service role)
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { 
      role: 'team_member',
      password_set: false  // Explicitly mark as first-time invite
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data.user.id }, { status: 200 });
}
