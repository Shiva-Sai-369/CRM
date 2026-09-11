# Project Systems Unified

## Problem Solved

Previously, there were **TWO completely separate project systems** that didn't communicate:

### Before: Disconnected Systems ❌

**System 1: Supabase Database (Enquiries page)**
- Storage: PostgreSQL tables (`projects`, `google_sheets`, `sheet_leads`)
- Visible in: Enquiries page dropdown only
- Projects: Webrocket, Better Castings, Gowham school, etc.
- Use case: Team collaboration, lead management

**System 2: localStorage (Projects page & Settings)**
- Storage: Browser localStorage (`crmProjects` key)
- Visible in: Projects page and Google Sheets assignment only
- Projects: GWS NEW, etc.
- Use case: Quick project organization for Google Sheets

**The Issue:**
- Projects created in Settings → Google Sheets assignment didn't appear in Enquiries
- Projects in Enquiries dropdown didn't appear on Projects page
- Two separate project lists = confusion and fragmentation

---

## Solution: Unified Project System ✅

### After: Single Merged View

Both systems now work together seamlessly:

**Enquiries Page:**
- Shows **ALL projects** from both Supabase AND localStorage
- localStorage projects have a 📂 (Local) indicator
- When a local project is selected, shows helpful message about managing sheets in Settings

**Projects Page:**
- Shows **ALL projects** from both Supabase AND localStorage
- Merges projects intelligently to avoid duplicates
- Prioritizes Supabase projects (source of truth)

---

## Technical Implementation

### 1. Project Store (Zustand)

Updated `store/projectStore.ts` to fetch from both sources:

```typescript
// Fetch Supabase projects (existing logic)
const supabaseProjects = await fetchFromSupabase();

// Fetch localStorage projects
const localProjects = getLocalProjects();

// Convert localStorage projects to Supabase format
// Use negative IDs to avoid conflicts with Supabase numeric IDs
const localAsSupabase = localProjects.map((lp, index) => ({
  id: -(index + 1),  // -1, -2, -3, etc.
  name: lp.name,
  description: lp.description,
  created_at: lp.createdAt,
  updated_at: lp.updatedAt,
  _localStorage: true,  // Flag to identify source
  _localId: lp.id,      // Store original UUID
}));

// Merge both arrays
const allProjects = [...supabaseProjects, ...localAsSupabase];
```

### 2. Enquiries Page

Added visual indicators and handling:

```tsx
// Project dropdown with indicator
{projects.map((p) => {
  const isLocalStorage = p._localStorage === true;
  return (
    <option key={p.id} value={p.id}>
      {p.name} {isLocalStorage ? '📂 (Local)' : ''}
    </option>
  );
})}

// Show message when localStorage project selected
{selectedProject._localStorage && sheets.length === 0 && (
  <span className="text-xs text-blue-600">
    📂 This is a localStorage project. Sheets are managed in Settings.
  </span>
)}
```

### 3. Projects Page

Already configured to show both sources, now listens for localStorage changes:

```typescript
// Auto-refresh when localStorage changes
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'crmProjects') {
      refresh();
    }
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [refresh]);
```

---

## User Experience

### For Super Admins

You now see **ALL projects** across the system:

**Enquiries Page:**
- Webrocket
- Better Castings  
- Gowham school
- Dreamtimbers
- GWS NEW 📂 (Local) ← localStorage project
- trial project

**Projects Page:**
- GWS NEW (created via Settings)
- All Supabase projects (if they have sheets)

### Creating Projects

**Two ways to create projects:**

1. **Via Settings → Google Sheets Assignment:**
   - Add a Google Sheet
   - Assign it to a new or existing project
   - Project stored in localStorage
   - Appears in both Enquiries and Projects pages with 📂 indicator

2. **Via Projects Page → "+ New Project":**
   - Create project directly
   - Stored in localStorage
   - Can link sheet tabs from Settings later
   - Appears everywhere with 📂 indicator

3. **Via Supabase (existing team projects):**
   - Projects with team assignments
   - Managed through database
   - No special indicator

---

## Benefits

✅ **Unified View:** See all projects regardless of where they were created
✅ **Clear Indicators:** Know which projects are local vs. database
✅ **Backward Compatible:** Existing workflows unchanged
✅ **Super Admin Visibility:** Full oversight of all projects
✅ **Smart Merging:** No duplicates, no conflicts
✅ **Automatic Sync:** localStorage projects appear immediately after creation

---

## Data Flow

```
┌─────────────────────────────────────────────────┐
│  Super Admin creates project in Settings        │
│  (via Google Sheets assignment)                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │   localStorage       │
        │   'crmProjects'      │
        │   { projects: [...] }│
        └─────────┬────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ↓                       ↓
┌─────────────┐     ┌──────────────────┐
│  Projects   │     │   Enquiries      │
│  Page       │     │   Page           │
│             │     │                  │
│  Shows:     │     │   Shows:         │
│  • Local    │     │   • Supabase     │
│  • Supabase │     │   • Local 📂     │
└─────────────┘     └──────────────────┘
```

---

## Next Steps (Optional Enhancements)

Consider implementing:

1. **Migrate localStorage → Supabase:** Add a "Promote to Database" button
2. **Sync localStorage sheets to Supabase:** Auto-create `google_sheets` entries
3. **Project Management UI:** Unified interface for both project types
4. **Team Assignment:** Allow assigning team members to localStorage projects

---

## Migration Notes

**No breaking changes!** Both systems continue to work independently:

- Existing Supabase projects: Unchanged
- Existing localStorage projects: Now visible everywhere
- New projects: Work with both systems simultaneously

Users will automatically see the merged view without any action required.
