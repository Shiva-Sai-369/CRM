/**
 * GET /api/all-users
 * super_admin only.
 * Returns all user profiles with their project assignments.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';
import type { Profile, ProjectAssignment } from '@/types/rbac';

export interface UserWithAssignments extends Profile {
  assignments: ProjectAssignment[];
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fetch all profiles
  const { data: users, error: usersErr } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const typedUsers = (users ?? []) as Profile[];

  // Fetch all project assignments
  const { data: assignments, error: assignErr } = await admin
    .from('project_assignments')
    .select('*');

  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 });

  const typedAssignments = (assignments ?? []) as ProjectAssignment[];

  // Group assignments by user_id
  const assignmentsByUser = typedAssignments.reduce<Record<string, ProjectAssignment[]>>((acc, a) => {
    if (!acc[a.user_id]) acc[a.user_id] = [];
    acc[a.user_id].push(a);
    return acc;
  }, {});

  const result: UserWithAssignments[] = typedUsers.map((u) => ({
    ...u,
    assignments: assignmentsByUser[u.id] ?? [],
  }));

  return NextResponse.json({ users: result }, { status: 200 });
}
