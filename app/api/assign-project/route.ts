/**
 * POST /api/assign-project
 * super_admin only.
 * Body: { userId: string, projectId: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
  }

  let userId: string;
  let projectId: number;
  try {
    const body = await request.json() as { userId?: unknown; projectId?: unknown };
    if (typeof body.userId !== 'string') throw new Error('invalid userId');
    if (typeof body.projectId !== 'number') throw new Error('invalid projectId');
    userId = body.userId;
    projectId = body.projectId;
  } catch {
    return NextResponse.json({ error: 'Invalid body. Expected { userId: string, projectId: number }' }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('project_assignments')
    .upsert({ user_id: userId, project_id: projectId }, { onConflict: 'user_id,project_id' });

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}
