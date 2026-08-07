import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * CRITICAL: These tests MUST PASS on UNFIXED code - they capture baseline behavior to preserve.
 * Run these tests BEFORE implementing the fix to establish the preservation baseline.
 * 
 * These tests verify that existing behavior for users WITH passwords remains unchanged:
 * - Existing users with passwords redirect to role-based destinations
 * - Client invites create project_assignments rows correctly
 * - Team member invites create profiles with role team_member
 * - Middleware enforces RBAC rules correctly
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE: Tests PASS (this confirms baseline behavior)
 * EXPECTED OUTCOME ON FIXED CODE: Tests STILL PASS (this confirms no regressions)
 */

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserProfile: vi.fn(),
  getUserProjectIds: vi.fn(),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn((url: string) => ({ redirect: true, url })),
    },
  };
});

import { createServerClient } from '@/lib/supabase-server';
import { getUserProfile, getUserProjectIds } from '@/lib/auth';

describe('Preservation Property Tests: Existing Login Flow and RBAC Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 2: Preservation - Existing Login Flow for Super Admin
   * 
   * **Validates: Requirement 3.1**
   * 
   * GIVEN a super_admin user with an existing password logs in
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect to /projects
   * AND the user SHALL NOT be redirected to /set-password
   */
  it('should redirect super_admin with existing password to /projects (NOT /set-password)', async () => {
    // Arrange: Mock Supabase client for existing super_admin with password
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'existing-admin-123',
              email: 'admin@example.com',
              user_metadata: {
                role: 'super_admin',
                password_set: true, // CRITICAL: Existing user has password
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'existing-admin-123',
      email: 'admin@example.com',
      role: 'super_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=admin-login-code');
    const response = await GET(request);

    // Assert: Expect direct redirect to /projects (NOT /set-password)
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These MUST PASS on both unfixed and fixed code
    expect(redirectUrl).toContain('/projects');
    expect(redirectUrl).not.toContain('/set-password');
  });

  /**
   * Property 2: Preservation - Existing Login Flow for Team Member
   * 
   * **Validates: Requirement 3.2**
   * 
   * GIVEN a team_member user with an existing password logs in
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect to /projects
   * AND the user SHALL NOT be redirected to /set-password
   */
  it('should redirect team_member with existing password to /projects (NOT /set-password)', async () => {
    // Arrange: Mock Supabase client for existing team_member with password
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'existing-member-456',
              email: 'member@example.com',
              user_metadata: {
                role: 'team_member',
                password_set: true, // CRITICAL: Existing user has password
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'existing-member-456',
      email: 'member@example.com',
      role: 'team_member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=member-login-code');
    const response = await GET(request);

    // Assert: Expect direct redirect to /projects (NOT /set-password)
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These MUST PASS on both unfixed and fixed code
    expect(redirectUrl).toContain('/projects');
    expect(redirectUrl).not.toContain('/set-password');
  });

  /**
   * Property 2: Preservation - Existing Login Flow for Client
   * 
   * **Validates: Requirement 3.3**
   * 
   * GIVEN a client user with an existing password logs in
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect to /analytics/[project_id]
   * AND the user SHALL NOT be redirected to /set-password
   */
  it('should redirect client with existing password to /analytics/[id] (NOT /set-password)', async () => {
    // Arrange: Mock Supabase client for existing client with password
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'existing-client-789',
              email: 'client@example.com',
              user_metadata: {
                role: 'client',
                password_set: true, // CRITICAL: Existing user has password
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'existing-client-789',
      email: 'client@example.com',
      role: 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(getUserProjectIds).mockResolvedValue([42]);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=client-login-code');
    const response = await GET(request);

    // Assert: Expect direct redirect to /analytics/[id] (NOT /set-password)
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These MUST PASS on both unfixed and fixed code
    expect(redirectUrl).toContain('/analytics/42');
    expect(redirectUrl).not.toContain('/set-password');
  });

  /**
   * Property 2: Preservation - Custom Next Parameter for Super Admin
   * 
   * **Validates: Requirement 3.1**
   * 
   * GIVEN a super_admin user with password logs in with ?next=/settings
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect to /settings (respecting the next parameter)
   * AND the user SHALL NOT be redirected to /set-password
   */
  it('should redirect super_admin with password to custom next parameter', async () => {
    // Arrange: Mock Supabase client for super_admin with custom next parameter
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'admin-custom-next',
              email: 'admin@example.com',
              user_metadata: {
                role: 'super_admin',
                password_set: true,
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'admin-custom-next',
      email: 'admin@example.com',
      role: 'super_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler with ?next=/settings
    const request = new Request('http://localhost:3000/auth/callback?code=abc&next=/settings');
    const response = await GET(request);

    // Assert: Expect redirect to /settings (respecting next parameter)
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These MUST PASS on both unfixed and fixed code
    expect(redirectUrl).toContain('/settings');
    expect(redirectUrl).not.toContain('/set-password');
  });

  /**
   * Property 2: Preservation - Client Invite Project Assignment Creation
   * 
   * **Validates: Requirement 3.4**
   * 
   * GIVEN a client invite is accepted with invited_to_project_id in metadata
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL create a project_assignments row with correct user_id and project_id
   * AND the upsert operation SHALL be called with the correct parameters
   */
  it('should create project_assignments row for client invite with invited_to_project_id', async () => {
    // Arrange: Mock Supabase client for client invite with project metadata
    const upsertMock = vi.fn().mockResolvedValue({});
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'new-client-with-project',
              email: 'client@example.com',
              user_metadata: {
                role: 'client',
                invited_to_project_id: 99, // CRITICAL: Project ID from invite metadata
                password_set: true, // Assume password set to focus on project assignment logic
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'new-client-with-project',
      email: 'client@example.com',
      role: 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(getUserProjectIds).mockResolvedValue([99]);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=client-invite-code');
    await GET(request);

    // Assert: Verify project_assignments upsert was called correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('project_assignments');
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'new-client-with-project', project_id: 99 },
      { onConflict: 'user_id,project_id' }
    );
  });

  /**
   * Property 2: Preservation - Profile Retry Logic
   * 
   * **Validates: Requirement 3.5**
   * 
   * GIVEN a user accepts an invite and the profile is not immediately available
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL retry fetching the profile after 500ms
   * AND the system SHALL proceed with role-based redirection once profile is available
   */
  it('should retry profile fetch if not immediately available', async () => {
    // Arrange: Mock Supabase client
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-slow-profile',
              email: 'slow@example.com',
              user_metadata: {
                role: 'super_admin',
                password_set: true,
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    
    // Mock getUserProfile to return null first, then return profile on retry
    vi.mocked(getUserProfile)
      .mockResolvedValueOnce(null) // First call returns null
      .mockResolvedValueOnce({     // Second call (after retry) returns profile
        id: 'user-slow-profile',
        email: 'slow@example.com',
        role: 'super_admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=slow-profile-code');
    const response = await GET(request);

    // Assert: Verify getUserProfile was called twice (initial + retry)
    expect(getUserProfile).toHaveBeenCalledTimes(2);
    expect(getUserProfile).toHaveBeenCalledWith('user-slow-profile');
    
    // Assert: User is redirected successfully after retry
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    expect(redirectUrl).toContain('/projects');
  });

  /**
   * Property 2: Preservation - Profile Creation Failure Handling
   * 
   * **Validates: Requirement 3.5**
   * 
   * GIVEN a user accepts an invite but profile creation fails (still null after retry)
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL redirect to /login?error=profile_missing
   */
  it('should redirect to login with error if profile creation fails after retry', async () => {
    // Arrange: Mock Supabase client
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-no-profile',
              email: 'noprofile@example.com',
              user_metadata: {
                role: 'super_admin',
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    
    // Mock getUserProfile to always return null (profile creation failed)
    vi.mocked(getUserProfile).mockResolvedValue(null);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=no-profile-code');
    const response = await GET(request);

    // Assert: Verify redirect to login with error
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    expect(redirectUrl).toContain('/login');
    expect(redirectUrl).toContain('error=profile_missing');
  });

  /**
   * Property 2: Preservation - Client Without Project Assignment
   * 
   * **Validates: Requirement 3.3**
   * 
   * GIVEN a client user has no project assignments
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect to /login?error=no_project
   */
  it('should redirect client without project assignments to login with error', async () => {
    // Arrange: Mock Supabase client for client without projects
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'client-no-projects',
              email: 'noprojects@example.com',
              user_metadata: {
                role: 'client',
                password_set: true,
              },
            },
          },
        }),
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({}),
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(getUserProfile).mockResolvedValue({
      id: 'client-no-projects',
      email: 'noprojects@example.com',
      role: 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(getUserProjectIds).mockResolvedValue([]); // No projects

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=no-project-code');
    const response = await GET(request);

    // Assert: Verify redirect to login with error
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    expect(redirectUrl).toContain('/login');
    expect(redirectUrl).toContain('error=no_project');
  });

  /**
   * Property 2: Preservation - Auth Code Exchange Failure
   * 
   * **Validates: General error handling preservation**
   * 
   * GIVEN the auth code exchange fails
   * WHEN the /auth/callback route processes the request
   * THEN the system SHALL redirect to /login?error=auth_failed
   */
  it('should redirect to login with error if auth code exchange fails', async () => {
    // Arrange: Mock Supabase client with auth failure
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ 
          error: { message: 'Invalid auth code' } 
        }),
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=invalid-code');
    const response = await GET(request);

    // Assert: Verify redirect to login with error
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    expect(redirectUrl).toContain('/login');
    expect(redirectUrl).toContain('error=auth_failed');
    
    // Verify getUser was NOT called (auth exchange failed)
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  /**
   * Property 2: Preservation - No User After Auth Exchange
   * 
   * **Validates: General error handling preservation**
   * 
   * GIVEN the auth code exchange succeeds but no user is returned
   * WHEN the /auth/callback route processes the request
   * THEN the system SHALL redirect to /login
   */
  it('should redirect to login if no user is returned after auth exchange', async () => {
    // Arrange: Mock Supabase client with no user
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=no-user-code');
    const response = await GET(request);

    // Assert: Verify redirect to login
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    expect(redirectUrl).toContain('/login');
    expect(redirectUrl).not.toContain('error='); // No error parameter for this case
  });
});
