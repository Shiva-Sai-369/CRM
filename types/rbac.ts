/**
 * types/rbac.ts
 * Role-based access control types.
 * Profile and ProjectAssignment are defined in types/supabase.ts and re-exported here.
 */
export type { Profile, ProjectAssignment } from '@/types/supabase';

export type UserRole = 'super_admin' | 'team_member' | 'client';

export interface TeamMemberWithAssignments {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  assignments: Array<{
    id: number;
    user_id: string;
    project_id: number;
    created_at: string;
  }>;
}

/** Shape returned by the get_project_analytics RPC */
export interface AnalyticsData {
  project_id: number;
  total_leads: number;
  status_breakdown: Record<string, number> | null;
  leads_over_time: Array<{ date: string; count: number }> | null;
}

/** Server-side session info passed to middleware / route handlers */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  assignedProjectIds: number[];
}
