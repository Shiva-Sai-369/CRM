/**
 * lib/auth.ts
 *
 * Server-side auth helpers — fetch session, profile, and project assignments.
 * All functions use the cookie-based server client (no service role needed).
 */
import { createServerClient } from '@/lib/supabase-server';
import type { Profile, SessionUser, UserRole } from '@/types/rbac';

/**
 * Returns the current authenticated Supabase user, or null if unauthenticated.
 */
export async function getCurrentUser() {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Returns the profiles row for a given user ID.
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

/**
 * Returns all project IDs the user is assigned to.
 */
export async function getUserProjectIds(userId: string): Promise<number[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', userId);
  if (error || !data) return [];
  return (data as Array<{ project_id: number }>).map((r) => r.project_id);
}

/**
 * Returns a fully hydrated SessionUser (user + role + assigned projects).
 * Returns null if the user is not authenticated or profile is missing.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  if (!profile) return null;

  const assignedProjectIds = await getUserProjectIds(user.id);

  return {
    id: user.id,
    email: profile.email,
    role: profile.role as UserRole,
    assignedProjectIds,
  };
}
