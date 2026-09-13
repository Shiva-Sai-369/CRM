/**
 * POST /api/update-user-status
 * super_admin only.
 * Updates a user's active status (activate/deactivate).
 * Reuses the last-super_admin lockout logic from deactivate-user.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';
import type { Profile } from '@/types/supabase';

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
  let isActive: boolean;
  try {
    const body = await request.json() as { userId?: string; isActive?: boolean };
    targetUserId = body.userId;
    isActive = body.isActive;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid isActive' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Cannot deactivate yourself
  if (!isActive && targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
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

  const typed = targetProfile as Profile;

  // If deactivating a super_admin, check if they're the last active one
  if (!isActive && typed.role === 'super_admin') {
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
        { error: 'Cannot deactivate the last active super_admin' },
        { status: 400 }
      );
    }
  }

  // Update profile
  const { error: updateErr } = await (admin
    .from('profiles') as any)
    .update({ is_active: isActive })
    .eq('id', targetUserId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Update auth ban status
  try {
    if (!isActive) {
      // Ban user
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h', // Ban for ~100 years
      });
    } else {
      // Unban user (set ban_duration to 'none')
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      });
    }
  } catch {
    // Continue even if auth update fails
  }

  return NextResponse.json(
    {
      success: true,
      message: isActive ? `User ${typed.email} activated` : `User ${typed.email} deactivated`,
    },
    { status: 200 }
  );
}
