/**
 * POST /api/invite-client
 * super_admin OR team_member (if assigned to projectId).
 * Body: { email: string, password: string, projectId: number }
 *
 * Creates a client account directly with password and assigns to project. No email sent.
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
  let password: string;
  let projectId: number;
  try {
    const body = await request.json() as { email?: unknown; password?: unknown; projectId?: unknown };
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      throw new Error('invalid email');
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
      throw new Error('password must be at least 8 characters');
    }
    if (typeof body.projectId !== 'number' || !Number.isInteger(body.projectId)) {
      throw new Error('invalid projectId');
    }
    email = body.email.trim().toLowerCase();
    password = body.password;
    projectId = body.projectId;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request body. Expected { email: string, password: string, projectId: number }' },
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

  // Create user directly with Admin API
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'client',
      password_set: true
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create project assignment for the client
  // Cast to any to work around Supabase TS generic on composite PK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: assignError } = await (supabase as any)
    .from('project_assignments')
    .upsert({ user_id: data.user.id, project_id: projectId }, { onConflict: 'user_id,project_id' });

  if (assignError) {
    // User was created but assignment failed - log warning but don't fail the request
    console.error('[invite-client] Failed to create project assignment:', assignError);
  }

  return NextResponse.json({ 
    success: true, 
    userId: data.user.id,
    email,
    password  // Return password so admin can copy it
  }, { status: 200 });
}
