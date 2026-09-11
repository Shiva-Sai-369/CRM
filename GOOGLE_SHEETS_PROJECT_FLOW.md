# Google Sheets → Project Assignment Flow

## Overview

When adding a new Google Sheet, users now follow a streamlined flow that links sheets to specific projects, enabling better organization and project-based lead management.

## User Flow

### 1. Add Google Sheet (Public or Private)

**Option A: Public Sheet**
1. Go to Settings page
2. Paste Google Sheet URL in "Public Sheet" section
3. Click "Fetch Tabs"
4. Select the tabs you want to import
5. Click "Save [X] Selected Tabs"

**Option B: Private Sheet**
1. Go to Settings page
2. Enter tab name in "Private Sheet" section
3. Paste published CSV URL
4. (Optional) Click "Test Connection" to verify
5. Click "Save Tab"

### 2. Assign to Project (Auto-triggered)

After saving:
- **Single tab saved:** Project selector modal opens automatically
- **Multiple tabs saved:** Notification appears, assign later in "Saved Tabs" section

### 3. Project Selection Modal

Choose one of two options:

**Option A: Select Existing Project**
- Browse list of existing projects
- Select a project via radio button
- Click "Link to Project"

**Option B: Create New Project**
- Click "Create New" tab
- Enter project name (required)
- Enter description (optional)
- Click "Create & Link"

### 4. Manage Assignments

In the **Saved Tabs** section:
- View which projects each sheet is assigned to (purple badges)
- Click "+ Assign to Project" to add more project links
- Click "×" on project badge to unlink sheet from project
- Rename or remove sheets as needed

## Features

### ✅ Implemented

- **Auto-prompt for single sheets:** When saving one sheet, project selector opens automatically
- **Create projects on-the-fly:** No need to pre-create projects
- **Multi-project linking:** One sheet can be assigned to multiple projects
- **Visual indicators:** Purple badges show project assignments
- **Quick unlinking:** Click "×" to remove project assignment
- **Unassigned sheet indicator:** Shows "Not assigned to any project" for unlinked sheets

### Storage

- **Projects:** Stored in localStorage under `crmProjects.projects[]`
- **Sheet Tabs:** Stored in localStorage under `sheetTabs[]`
- **Project-Sheet Links:** Stored in localStorage under `crmProjects.projectSheets[]`

## Data Structure

```typescript
// Project
{
  id: string;           // uuid
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Sheet Tab
{
  id: string;           // uuid
  name: string;
  url: string;
  addedAt: string;
}

// Project-Sheet Link
{
  id: string;           // uuid
  projectId: string;    // FK → Project.id
  tabId: string;        // FK → SheetTab.id
  tabName: string;      // denormalized
  tabUrl: string;       // denormalized
  addedAt: string;
}
```

## Benefits

1. **Better Organization:** Group sheets by client/project
2. **Easier Navigation:** Find relevant sheets quickly
3. **Flexible Workflow:** Assign sheets immediately or later
4. **No Pre-setup Required:** Create projects as you add sheets
5. **Multi-tenancy Ready:** One sheet can serve multiple projects

## Next Steps

Consider implementing:
- Project-based filtering on Enquiries page
- Bulk assignment of multiple sheets to one project
- Project management page (rename, delete, view all linked sheets)
- Import sheets directly from Projects page
