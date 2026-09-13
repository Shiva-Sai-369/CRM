/**
 * POST /api/update-user-role
 * super_admin only.
 * Updates a user's role (super_admin / team_member / client).
 * Includes last-super_admin lockout guard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';
import type { UserRole } from '@/types/rbac';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check caller is super_admin
  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
  }

  // Parse request body
  let targetUserId: string;
  let newRole: UserRole;
  try {
    const body = await request.json() as { userId?: string; role?: string };
    targetUserId = body.userId;
    newRole = body.role as UserRole;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (!['super_admin', 'team_member', 'client'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get target user profile
  const { data: targetProfile, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (profileErr || !targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentRole = (targetProfile as any).role as UserRole;

  // If demoting a super_admin, check if they're the last one
  if (currentRole === 'super_admin' && newRole !== 'super_admin') {
    const { data: superAdmins, error: countErr } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const activeSuperAdminCount = superAdmins?.length ?? 0;
    if (activeSuperAdminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot demote the last super_admin. Promote another user first.' },
        { status: 400 }
      );
    }
  }

  // Update role
  const { error: updateErr } = await (admin
    .from('profiles') as any)
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Update user metadata in auth (for consistency)
  try {
    await admin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { role: newRole },
    });
  } catch {
    // Continue even if metadata update fails
  }

  return NextResponse.json(
    {
      success: true,
      message: `Role updated to ${newRole}`,
    },
    { status: 200 }
  );
}
