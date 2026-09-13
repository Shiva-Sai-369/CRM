/**
 * POST /api/update-user-projects
 * super_admin only.
 * Updates project assignments for a user (add/remove project_assignments rows).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';

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
  let projectIds: number[];
  try {
    const body = await request.json() as { userId?: string; projectIds?: number[] };
    targetUserId = body.userId;
    projectIds = body.projectIds ?? [];
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (!Array.isArray(projectIds) || !projectIds.every(id => Number.isInteger(id))) {
      return NextResponse.json({ error: 'Invalid projectIds array' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get current assignments
  const { data: currentAssignments, error: fetchErr } = await admin
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', targetUserId);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const currentProjectIds = new Set(
    (currentAssignments ?? []).map((a: { project_id: number }) => a.project_id)
  );
  const newProjectIds = new Set(projectIds);

  // Determine what to add and remove
  const toAdd = projectIds.filter(id => !currentProjectIds.has(id));
  const toRemove = Array.from(currentProjectIds).filter(id => !newProjectIds.has(id));

  // Remove assignments
  if (toRemove.length > 0) {
    const { error: removeErr } = await admin
      .from('project_assignments')
      .delete()
      .eq('user_id', targetUserId)
      .in('project_id', toRemove);

    if (removeErr) {
      return NextResponse.json({ error: removeErr.message }, { status: 500 });
    }
  }

  // Add new assignments
  if (toAdd.length > 0) {
    const rows = toAdd.map(projectId => ({
      user_id: targetUserId,
      project_id: projectId,
    }));

    const { error: insertErr } = await (admin
      .from('project_assignments') as any)
      .insert(rows);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Project assignments updated',
      added: toAdd.length,
      removed: toRemove.length,
    },
    { status: 200 }
  );
}
