import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getUserProfile, getUserProjectIds } from '@/lib/auth';

/**
 * /auth/callback
 *
 * Handles three flows:
 *   1. Email OTP / magic link  → ?code=...  (Supabase Auth Code Exchange)
 *   2. Invite link acceptance  → same ?code= path, role in user_metadata
 *   3. Post-login role redirect  → already logged in, hits ?next=...
 *
 * After session is established, redirects based on role:
 *   super_admin / team_member → /projects (or ?next param)
 *   client                    → /analytics/[their_project_id]
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/projects';

  const supabase = createServerClient();

  // Exchange the auth code for a session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // Fetch current user after session is established
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Fetch profile (may not exist yet if trigger is async — retry once)
  let profile = await getUserProfile(user.id);
  if (!profile) {
    // Give the trigger a moment and retry
    await new Promise((r) => setTimeout(r, 500));
    profile = await getUserProfile(user.id);
  }

  if (!profile) {
    // Profile creation failed — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=profile_missing`);
  }

  // Handle invite: if role is 'client', pre-create project_assignment
  // The project_id is stored in invite metadata by /api/invite-client
  const projectIdFromMeta = user.user_metadata?.invited_to_project_id as number | undefined;
  if (profile.role === 'client' && projectIdFromMeta) {
    // Insert assignment idempotently. Cast to any to work around Supabase TS generic on composite PK.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('project_assignments')
      .upsert({ user_id: user.id, project_id: projectIdFromMeta }, { onConflict: 'user_id,project_id' });
  }

  // Role-based redirect
  if (profile.role === 'client') {
    const projectIds = await getUserProjectIds(user.id);
    if (projectIds.length > 0) {
      return NextResponse.redirect(`${origin}/analytics/${projectIds[0]}`);
    }
    // Client with no assignment — unusual, send to login with message
    return NextResponse.redirect(`${origin}/login?error=no_project`);
  }

  // super_admin / team_member
  return NextResponse.redirect(`${origin}${next}`);
}
