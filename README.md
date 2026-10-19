# CRM — Lead Management & Project Tracking

A CRM for digital marketing agencies. Leads are pulled from Google Sheets into Supabase, grouped by project, and shown to each user according to their role.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row Level Security) and Zustand.

## How it works

### Lead data flow

```
Google Sheet tab ──(File → Share → Publish to web → CSV)──► published CSV URL
        │
        ▼
Settings page / project page ──► POST /api/sync-sheet-to-supabase
        │                              • fetches the CSV server-side, parses it with papaparse
        │                              • creates or updates the google_sheets row for (project, URL)
        │                              • adds the caller to project_assignments if not already assigned
        │                              • skips empty rows and duplicates (same email or phone in that sheet)
        │                              • inserts new rows into sheet_leads
        ▼
Enquiries / project pages read sheet_leads through Supabase, filtered by RLS
```

Syncing only inserts new leads. Existing rows are not updated from the sheet.

> **Note:** Publishing a tab to the web makes it readable by anyone who has the URL.

### Roles

Access is enforced in two places. `middleware.ts` handles page routing, and Supabase RLS policies handle data access.

| Role | Lands on | Can use |
|---|---|---|
| `super_admin` | `/projects` | Everything except `/analytics/*`, including `/team` and `/team/manage` |
| `team_member` | `/projects`, or `/no-projects` if they have no assignments | Projects they are assigned to. They are redirected away from `/team` and `/analytics/*`. |
| `client` | `/analytics/<their first assigned project>` | Only `/analytics/[projectId]`, backed by the `get_project_analytics` RPC |

New accounts get their `profiles` row from the `handle_new_user` trigger, which copies `user_metadata.role`. In the last documented schema, the trigger defaults to `client`.

### Database tables used by the app

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user: `role`, `is_active`, display name |
| `projects` | Client projects |
| `project_assignments` | Which users can see which projects |
| `google_sheets` | Sheet tabs linked to a project (`spreadsheet_id` holds the CSV URL) |
| `sheet_leads` | Leads imported from sheets |
| `lead_notes` | Notes on a lead |
| `tasks` | Tasks, optionally linked to leads |
| `custom_statuses` | Per-project lead statuses (`sql/create_custom_statuses_table.sql`) |

### Leftovers from the pre-Supabase version

Some code from the original browser-only CSV version is still wired in. `lib/projectStorage.ts` keeps projects in `localStorage`, and `lib/services/fetchLeads.ts` fetches and parses CSV in the browser. The Settings page and project store still merge these `localStorage` projects in, where they show up with negative IDs. **They can't be synced.** Create the project on the Projects page first.

## Getting started

### Prerequisites
- Node.js 18+
- A Supabase project

### 1. Install

```bash
npm install
```

### 2. Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# Server-only. Needed for creating, deactivating, and reactivating users.
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### 3. Database

> ⚠️ **The core schema is not checked into this repo yet.** `sql/` only contains `create_custom_statuses_table.sql`.

Until the schema is restored as migrations, the last documented versions are in git history:

```bash
git show '459913c^:RBAC_SETUP.md'                 # tables, handle_new_user trigger, RLS, get_project_analytics RPC
git show 'f3de60a^:docs/DEACTIVATION_SQL.md'      # is_active column + updated get_my_role()/has_project_access() and policies
```

Later commits (for example `a9f7acb`) changed RLS policies, so compare these against the live Supabase project before relying on them. After the core schema, run `sql/create_custom_statuses_table.sql`.

### 4. Create the first super admin

The login page has no sign-up.
1. In Supabase, go to **Authentication → Users → Add user**. Enter an email and password and tick auto-confirm.
2. In the SQL editor, run:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Sign in at `/login`.

Create all other accounts from inside the app. See [docs/USER_MANAGEMENT.md](./docs/USER_MANAGEMENT.md).

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test         # Vitest is configured; no test files are checked in yet
```

## Connecting a Google Sheet

1. In the sheet, go to **File → Share → Publish to web**, pick the tab, and choose **Comma-separated values (.csv)**. Then publish.
2. In **Settings**, add the tab:
   - **Public Sheet**: paste the sheet URL or ID and the tabs are discovered automatically.
   - **Private Sheet**: paste each tab's published CSV URL (`…/pub?output=csv`) one at a time.
3. Link the tab to a Supabase project. Linking triggers the first sync.
4. To pull in new rows later, use **Sync** on the project page.

### Column mapping

The sync route reads these columns. Header names are matched exactly.

| Lead field | Columns read |
|---|---|
| Name | `Name`, `full_name` |
| Email | `Email`, `email` (lower-cased) |
| Phone | `Phone`, `phone_number` (a leading `p:` is stripped) |
| Company | `Company`, `company` |
| Status | `Status`, `lead_status` (default `new`, lower-cased) |
| Created at | `Timestamp`, `created_time` |

Facebook Lead Ads exports that have a `field_data` JSON column are also supported. In that case `full_name`, `email`, `phone_number` and `company` are read from the JSON.

## Project structure

```
app/
  api/            Route handlers: user management, project assignment, sheet sync, custom statuses
  analytics/      Client analytics view (/analytics/[projectId])
  enquiries/      Lead table (`/` redirects here)
  projects/       Project list and project detail (sheets, sync, client accounts)
  tasks/          Task tracking
  team/           Team page and /team/manage (super_admin only)
  settings/       Profile, password, Google Sheet connections
  login/, no-projects/
components/       UI components
lib/              Supabase clients (supabase.ts, supabase-server.ts), auth helpers, lead parsing/filtering/export
store/            Zustand stores (projects, filters, tasks)
types/            Supabase and domain types
sql/              SQL migrations
docs/             Feature documentation
middleware.ts     Session refresh and role-based routing
```

## Documentation

- [docs/USER_MANAGEMENT.md](./docs/USER_MANAGEMENT.md): account creation, project assignment, roles, deactivation

## Deployment

Any Next.js host works, including Vercel and Render. Set the three environment variables above. `SUPABASE_SERVICE_ROLE_KEY` must stay server-side and must never get a `NEXT_PUBLIC_` prefix.

## License

Proprietary. All rights reserved.
