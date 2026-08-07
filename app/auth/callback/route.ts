import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getUserProfile, getUserProjectIds } from '@/lib/auth';

/**
 * /auth/callback
 *
 * Handles invite link acceptance flow ONLY:
 *   - Invite link acceptance → ?code=... (Supabase Auth Code Exchange)
 *   - Role metadata from invite (super_admin, team_member, or client)
 *   - First-time login detection via password_set flag
 *   - Redirect to /set-password for first-time users
 *
 * NOTE: Normal password logins do NOT use this route - they redirect directly
 * from /login to their role-based destination.
 *
 * After session is established, redirects based on role:
 *   super_admin / team_member → /projects (or ?next param)
 *   client                    → /analytics/[their_project_id]
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/projects';

  console.log('[auth/callback] Request received:', { code: code ? 'present' : 'missing', next });

  const supabase = createServerClient();

  // Exchange the auth code for a session
  if (code) {
    console.log('[auth/callback] Exchanging code for session...');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] Code exchange failed:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
    console.log('[auth/callback] Code exchange successful');
  }

  // Fetch current user after session is established
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[auth/callback] No user found after session establishment');
    return NextResponse.redirect(`${origin}/login`);
  }

  console.log('[auth/callback] User authenticated:', { 
    id: user.id, 
    email: user.email,
    password_set: user.user_metadata?.password_set,
    role: user.user_metadata?.role
  });

  // Fetch profile (may not exist yet if trigger is async — retry once)
  let profile = await getUserProfile(user.id);
  if (!profile) {
    console.log('[auth/callback] Profile not found, retrying in 500ms...');
    // Give the trigger a moment and retry
    await new Promise((r) => setTimeout(r, 500));
    profile = await getUserProfile(user.id);
  }

  if (!profile) {
    // Profile creation failed — redirect to login with error
    console.error('[auth/callback] Profile still missing after retry');
    return NextResponse.redirect(`${origin}/login?error=profile_missing`);
  }

  console.log('[auth/callback] Profile loaded:', { role: profile.role });

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

  // Check if user needs to set password (first-time invite)
  // Invite APIs explicitly set password_set: false for new invites
  // After password setup, /set-password sets password_set: true
  const needsPasswordSetup = user.user_metadata?.password_set === false;

  console.log('[auth/callback] Password setup check:', { 
    needsPasswordSetup,
    password_set_value: user.user_metadata?.password_set 
  });

  if (needsPasswordSetup) {
    // Determine intended destination based on role
    let intendedDestination: string;
    if (profile.role === 'client') {
      const projectIds = await getUserProjectIds(user.id);
      if (projectIds.length > 0) {
        intendedDestination = `/analytics/${projectIds[0]}`;
      } else {
        // Client with no assignment — unusual, default to projects
        intendedDestination = '/projects';
      }
    } else {
      // super_admin / team_member
      intendedDestination = next;
    }

    console.log('[auth/callback] Redirecting to password setup with destination:', intendedDestination);
    
    // Redirect to password setup page with destination parameter
    return NextResponse.redirect(
      `${origin}/set-password?destination=${encodeURIComponent(intendedDestination)}`
    );
  }

  console.log('[auth/callback] User has password set, proceeding to role-based redirect');

  // Role-based redirect (existing users with passwords)
  if (profile.role === 'client') {
    const projectIds = await getUserProjectIds(user.id);
    if (projectIds.length > 0) {
      console.log('[auth/callback] Redirecting client to analytics:', projectIds[0]);
      return NextResponse.redirect(`${origin}/analytics/${projectIds[0]}`);
    }
    // Client with no assignment — unusual, send to login with message
    console.warn('[auth/callback] Client has no project assignments');
    return NextResponse.redirect(`${origin}/login?error=no_project`);
  }

  // super_admin / team_member
  console.log('[auth/callback] Redirecting super_admin/team_member to:', next);
  return NextResponse.redirect(`${origin}${next}`);
}
