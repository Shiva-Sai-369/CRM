/**
 * POST /api/invite-client
 * super_admin OR team_member (if assigned to projectId).
 * Body: { email: string, projectId: number }
 *
 * Sends invite with role: 'client' in metadata and stores invited_to_project_id
 * so /auth/callback can pre-create the project_assignments row on first login.
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

  // Authorization: super_admin or team_member
  const profile = await getUserProfile(user.id);
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'team_member')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  let email: string;
  let projectId: number;
  try {
    const body = await request.json() as { email?: unknown; projectId?: unknown };
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      throw new Error('invalid email');
    }
    if (typeof body.projectId !== 'number' || !Number.isInteger(body.projectId)) {
      throw new Error('invalid projectId');
    }
    email = body.email.trim().toLowerCase();
    projectId = body.projectId;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body. Expected { email: string, projectId: number }' },
      { status: 400 }
    );
  }

  // If caller is team_member, verify they are assigned to projectId
  if (profile.role === 'team_member') {
    const { data: assignment, error: assignErr } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (assignErr || !assignment) {
      return NextResponse.json(
        { error: 'Forbidden: you are not assigned to this project' },
        { status: 403 }
      );
    }
  }

  // Send invite via Admin API with project metadata
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: 'client',
      invited_to_project_id: projectId,
      password_set: false  // Explicitly mark as first-time invite
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data.user.id }, { status: 200 });
}
