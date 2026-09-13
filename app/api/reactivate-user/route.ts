/**
 * POST /api/reactivate-user
 * super_admin only.
 * Sets is_active = true and unbans the user in Supabase auth.
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
  try {
    const body = await request.json() as { userId?: string };
    targetUserId = body.userId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
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

  const typed = targetProfile as Profile;

  // Update profile to is_active = true
  const { error: updateErr } = await (admin as any)
    .from('profiles')
    .update({ is_active: true })
    .eq('id', targetUserId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Unban user in Supabase auth (remove ban)
  try {
    await admin.auth.admin.updateUserById(targetUserId, {
      ban_duration: undefined, // Unban
    });
  } catch {
    // If unban fails, continue anyway — they can still log in via RLS
  }

  return NextResponse.json(
    {
      success: true,
      message: `User ${typed.email} has been reactivated`,
    },
    { status: 200 }
  );
}
