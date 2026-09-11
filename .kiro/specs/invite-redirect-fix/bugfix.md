# Bugfix Requirements Document

## Introduction

When users accept an email invite (magic link) sent via Supabase Auth, they are immediately redirected to role-based destinations (/projects for super_admin/team_member, /analytics/[project_id] for client) without being given the opportunity to set their password. This affects all first-time invite acceptances regardless of role. The /auth/callback route currently exchanges the auth code for a session and performs role-based redirection without checking whether this is a first-time login or if the user needs to set a password. This prevents invited users from establishing their credentials before accessing the application.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a super_admin user accepts an invite link for the first time THEN the system immediately redirects them to /projects without prompting for password setup

1.2 WHEN a team_member user accepts an invite link for the first time THEN the system immediately redirects them to /projects without prompting for password setup

1.3 WHEN a client user accepts an invite link for the first time THEN the system immediately redirects them to /analytics/[project_id] without prompting for password setup

1.4 WHEN the /auth/callback route processes an invite acceptance THEN the system does not check whether this is a first-time login requiring password setup

### Expected Behavior (Correct)

2.1 WHEN a super_admin user accepts an invite link for the first time THEN the system SHALL redirect them to a dedicated "Set Password" page where they can establish their password before accessing /projects

2.2 WHEN a team_member user accepts an invite link for the first time THEN the system SHALL redirect them to a dedicated "Set Password" page where they can establish their password before accessing /projects

2.3 WHEN a client user accepts an invite link for the first time THEN the system SHALL redirect them to a dedicated "Set Password" page where they can establish their password before accessing /analytics/[project_id]

2.4 WHEN the /auth/callback route processes an invite acceptance THEN the system SHALL detect first-time logins and redirect to the "Set Password" page accordingly

2.5 WHEN a user completes password setup on the "Set Password" page THEN the system SHALL redirect them to their appropriate role-based destination (super_admin/team_member → /projects, client → /analytics/[project_id])

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a super_admin user with an existing password logs in via email/password THEN the system SHALL CONTINUE TO redirect them to /projects

3.2 WHEN a team_member user with an existing password logs in via email/password THEN the system SHALL CONTINUE TO redirect them to /projects

3.3 WHEN a client user with an existing password logs in via email/password THEN the system SHALL CONTINUE TO redirect them to /analytics/[project_id]

3.4 WHEN a client invite is accepted THEN the system SHALL CONTINUE TO create the project_assignments row for the invited_to_project_id stored in metadata

3.5 WHEN a team_member invite is accepted THEN the system SHALL CONTINUE TO create the profile with role 'team_member' with zero initial project assignments

3.6 WHEN role-based authorization checks are performed THEN the system SHALL CONTINUE TO enforce existing RBAC rules correctly
