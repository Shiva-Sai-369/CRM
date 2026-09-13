/**
 * GET /api/team-members
 * super_admin only.
 * Returns all team_member profiles joined with their project assignments.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';
import type { Profile, ProjectAssignment, TeamMemberWithAssignments } from '@/types/rbac';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fetch all team_member profiles
  const { data: members, error: membersErr } = await admin
    .from('profiles')
    .select('*')
    .eq('role', 'team_member')
    .order('created_at', { ascending: true });

  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 });

  const typedMembers = (members ?? []) as Profile[];

  // Fetch all assignments for those team_members
  const memberIds = typedMembers.map((m) => m.id);
  let assignments: ProjectAssignment[] = [];
  if (memberIds.length > 0) {
    const { data: assignData, error: assignErr } = await admin
      .from('project_assignments')
      .select('*')
      .in('user_id', memberIds);
    if (!assignErr) {
      assignments = (assignData ?? []) as ProjectAssignment[];
    }
  }

  // Group assignments by user_id
  const assignmentsByUser = assignments.reduce<Record<string, ProjectAssignment[]>>((acc, a) => {
    if (!acc[a.user_id]) acc[a.user_id] = [];
    acc[a.user_id].push(a);
    return acc;
  }, {});

  const result: TeamMemberWithAssignments[] = typedMembers.map((m) => ({
    ...m,
    is_active: m.is_active !== false,
    assignments: assignmentsByUser[m.id] ?? [],
  }));

  return NextResponse.json({ members: result }, { status: 200 });
}
