# User Deactivation — Quick Start

## 5-Minute Setup

### 1. Run SQL in Supabase

Go to **Supabase → SQL Editor** and run each section from `DEACTIVATION_SQL.md`:

- Step 1: Add `is_active` column
- Step 2: Update `get_my_role()` function
- Step 3: Update `has_project_access()` function
- Step 4: Update ALL RLS policies (profiles, project_assignments, projects, google_sheets, sheet_leads, lead_notes, tasks)

**⏱ Time**: ~2 minutes (copy-paste each SQL block)

### 2. Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
# Then:
npm run dev
```

**⏱ Time**: ~30 seconds

### 3. Test It

1. Log in as super_admin at `http://localhost:3000`
2. Go to `/team`
3. Find a test team_member
4. Click **Deactivate**
5. Row should grey out with red "Deactivated" label
6. Click **Reactivate**
7. Row returns to normal

**✅ Done!**

---

## What Changed

- **Database**: Added `is_active` boolean column to profiles (default true)
- **Backend**: Two new API endpoints for super_admins only
- **Frontend**: Team page shows Deactivate/Reactivate buttons
- **Security**: RLS policies block deactivated users from accessing any data

---

## Key Features

✅ Super admin only (cannot deactivate other super_admins or self)
✅ No data deletion (notes, tasks, assignments all preserved)
✅ User cannot log in when deactivated
✅ All RLS policies immediately block their queries
✅ Can be reactivated anytime
✅ Strict TypeScript (no errors)

---

## Detailed Docs

- `DEACTIVATION_SQL.md` — All SQL migrations with explanations
- `DEACTIVATION_TESTING.md` — 6 comprehensive test scenarios
- `DEACTIVATION_IMPLEMENTATION.md` — Technical details, files changed, flow diagrams

---

## Troubleshooting

### Build fails after SQL changes
→ Restart dev server: `npm run dev`

### Deactivate button doesn't appear
→ Make sure you're logged in as super_admin
→ Check that the team_member has `role = 'team_member'` in the database

### Deactivated user can still log in
→ RLS policies may not have the `is_active` check
→ Re-run Step 4 of the SQL migrations (update all policies)

### "Manage Projects" still enabled for deactivated users
→ Check the UI properly has `disabled={!m.is_active}`
→ Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## API Endpoints

### Deactivate User
```bash
POST /api/deactivate-user
Authorization: Required (super_admin)
Content-Type: application/json

{
  "userId": "uuid-here"
}
```

### Reactivate User
```bash
POST /api/reactivate-user
Authorization: Required (super_admin)
Content-Type: application/json

{
  "userId": "uuid-here"
}
```

---

## One-Line Summary

Super admins can now deactivate team members from the Team page, which blocks them from logging in and accessing any data, while preserving all their created data.
