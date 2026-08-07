import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextResponse } from 'next/server';

/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * This test encodes the EXPECTED behavior after the fix is implemented:
 * - First-time invited users should be redirected to /set-password with destination parameter
 * - The destination should be role-based (/projects for super_admin/team_member, /analytics/[id] for client)
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
 * The counterexamples will show:
 * - super_admin invite redirects directly to /projects instead of /set-password
 * - team_member invite redirects directly to /projects instead of /set-password
 * - client invite redirects directly to /analytics/[id] instead of /set-password
 * - No password setup flow is triggered for first-time logins
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

describe('Bug Condition Exploration: First-Time Invite Redirect Without Password Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition - First-Time Invite Redirect Without Password Setup
   * 
   * Test Case 1: Super Admin Invite
   * GIVEN a user accepts a super_admin invite link for the first time
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL redirect to /set-password with destination=/projects
   * AND the user SHALL NOT be redirected directly to /projects
   */
  it('should redirect super_admin invite to /set-password before /projects access', async () => {
    // Arrange: Mock Supabase client for first-time super_admin invite
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'admin@example.com',
              user_metadata: {
                role: 'super_admin',
                // password_set is NOT present - indicates first-time login
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
      id: 'user-123',
      email: 'admin@example.com',
      role: 'super_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=abc123');
    const response = await GET(request);

    // Assert: Expect redirect to /set-password with destination parameter
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These will FAIL on unfixed code
    expect(redirectUrl).toContain('/set-password');
    expect(redirectUrl).toContain('destination=');
    expect(redirectUrl).toContain(encodeURIComponent('/projects'));
    
    // Document counterexample expected on unfixed code:
    // The unfixed code redirects directly to /projects without password setup
    // Expected failure message: "expected 'http://localhost:3000/projects' to contain '/set-password'"
  });

  /**
   * Test Case 2: Team Member Invite
   * GIVEN a user accepts a team_member invite link for the first time
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL redirect to /set-password with destination=/projects
   * AND the user SHALL NOT be redirected directly to /projects
   */
  it('should redirect team_member invite to /set-password before /projects access', async () => {
    // Arrange: Mock Supabase client for first-time team_member invite
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-456',
              email: 'member@example.com',
              user_metadata: {
                role: 'team_member',
                // password_set is NOT present - indicates first-time login
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
      id: 'user-456',
      email: 'member@example.com',
      role: 'team_member',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=def456');
    const response = await GET(request);

    // Assert: Expect redirect to /set-password with destination parameter
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These will FAIL on unfixed code
    expect(redirectUrl).toContain('/set-password');
    expect(redirectUrl).toContain('destination=');
    expect(redirectUrl).toContain(encodeURIComponent('/projects'));
    
    // Document counterexample expected on unfixed code:
    // The unfixed code redirects directly to /projects without password setup
  });

  /**
   * Test Case 3: Client Invite
   * GIVEN a user accepts a client invite link with projectId for the first time
   * WHEN the /auth/callback route processes the invite
   * THEN the system SHALL redirect to /set-password with destination=/analytics/[id]
   * AND the user SHALL NOT be redirected directly to /analytics/[id]
   */
  it('should redirect client invite to /set-password before /analytics/[id] access', async () => {
    // Arrange: Mock Supabase client for first-time client invite
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-789',
              email: 'client@example.com',
              user_metadata: {
                role: 'client',
                invited_to_project_id: 42,
                // password_set is NOT present - indicates first-time login
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
      id: 'user-789',
      email: 'client@example.com',
      role: 'client',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.mocked(getUserProjectIds).mockResolvedValue([42]);

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=ghi789');
    const response = await GET(request);

    // Assert: Expect redirect to /set-password with destination parameter
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // CRITICAL ASSERTIONS - These will FAIL on unfixed code
    expect(redirectUrl).toContain('/set-password');
    expect(redirectUrl).toContain('destination=');
    expect(redirectUrl).toContain(encodeURIComponent('/analytics/42'));
    
    // Document counterexample expected on unfixed code:
    // The unfixed code redirects directly to /analytics/42 without password setup
  });

  /**
   * Test Case 4: Preservation Check - Existing User With Password
   * GIVEN a user with an existing password logs in
   * WHEN the /auth/callback route processes the login
   * THEN the system SHALL redirect directly to role-based destination
   * AND the user SHALL NOT be redirected to /set-password
   * 
   * This test ensures the fix doesn't break existing login flow
   */
  it('should NOT redirect existing users with passwords to /set-password', async () => {
    // Arrange: Mock Supabase client for existing user with password
    const mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-existing',
              email: 'existing@example.com',
              user_metadata: {
                role: 'super_admin',
                password_set: true, // Existing user has password
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
      id: 'user-existing',
      email: 'existing@example.com',
      role: 'super_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Act: Call the callback route handler
    const request = new Request('http://localhost:3000/auth/callback?code=existing123');
    const response = await GET(request);

    // Assert: Expect direct redirect to /projects (NOT /set-password)
    expect(response).toBeDefined();
    const redirectUrl = (response as any).url;
    
    // This should pass on both unfixed and fixed code
    expect(redirectUrl).toContain('/projects');
    expect(redirectUrl).not.toContain('/set-password');
  });
});
