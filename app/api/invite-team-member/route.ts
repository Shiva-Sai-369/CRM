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
import type { UserRole } from '@/types/rbac';

// The generated Database type resolves profiles.update() to `never` (same reason sibling routes cast),
// so describe just the call we make instead of falling back to `any`.
interface ProfileRoleUpdater {
  update(values: { role: UserRole }): {
    eq(column: 'id', value: string): PromiseLike<{ error: { message: string } | null }>;
  };
}

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

  // The handle_new_user trigger always creates profiles as 'client' (sql/001) and ignores
  // user_metadata.role, so promote here with the service-role client. Fail closed: if the promotion
  // fails, remove the account rather than leave a client the admin believes is a team member.
  const { error: roleError } = await (admin.from('profiles') as unknown as ProfileRoleUpdater)
    .update({ role: 'team_member' })
    .eq('id', data.user.id);

  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { error: `Could not assign the team_member role: ${roleError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true, 
    userId: data.user.id,
    email,
    password  // Return password so admin can copy it
  }, { status: 200 });
}
