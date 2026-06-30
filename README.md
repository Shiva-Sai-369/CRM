# CRM Lead Enquiry Management

A modern web application for managing lead enquiries for small businesses, built with Next.js 14 and TypeScript.

## Features

- **Enquiries Page**: Complete lead management with filtering, sorting, and exporting
- **Advanced Filtering**: Filter by search, lead source, status, tags, and date range
- **Real-time Stats**: View key metrics (Total, New, Interested, Converted leads)
- **CSV Export**: Export filtered data to CSV
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **Type-Safe**: Strict TypeScript with no `any` types

## Tech Stack

- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Zustand (state management)
- papaparse (CSV parsing)
- date-fns (date handling)

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Configure your Google Sheet CSV URL**:

Edit `lib/config.ts` and add your published Google Sheet CSV URL:

```typescript
export const CONFIG = {
  sheetCsvUrl: "YOUR_GOOGLE_SHEET_CSV_URL_HERE",
  refreshIntervalMs: 0,
};
```

To get the CSV URL from Google Sheets:
- Open your Google Sheet
- Go to File → Share → Publish to web
- Select "Comma-separated values (.csv)" as the format
- Copy the generated URL

3. **Run the development server**:
```bash
npm run dev
```

4. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Expected CSV Format

Your Google Sheet should have the following columns:

| Column Name | Type | Example |
|-------------|------|---------|
| Name | Text | John Doe |
| Email | Email | john@example.com |
| Phone | Text | +1234567890 |
| Lead Source | Text | Facebook Messenger |
| Lead Status | Text | New Lead |
| Tags | Text | Lead, Follow-up |
| Last Message | Text | Interested in pricing |
| Last Message Date | Date | 25/12/2024 |
| Notes | Text | Follow up next week |
| Platform | Text | Facebook |

**Supported Lead Sources**: Facebook Messenger, Instagram DM, Facebook Comment, Manual

**Supported Lead Statuses**: New Lead, Contacted, Interested, Converted, Lost

**Supported Tags**: Lead, Customer, VIP, Follow-up (comma-separated)

**Supported Platforms**: Facebook, Instagram, Manual

## Project Structure

```
├── app/
│   ├── layout.tsx          # Main layout with sidebar
│   ├── page.tsx            # Redirect to /enquiries
│   ├── dashboard/
│   │   └── page.tsx        # Coming Soon placeholder
│   └── enquiries/
│       └── page.tsx        # Main enquiries page
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── FilterBar.tsx       # Filter controls
│   ├── StatsStrip.tsx      # Statistics cards
│   ├── LeadsTable.tsx      # Main table component
│   ├── LeadRow.tsx         # Individual lead row
│   ├── StatusBadge.tsx     # Status badge component
│   ├── TagPill.tsx         # Tag pill component
│   └── MultiSelect.tsx     # Reusable multi-select dropdown
├── lib/
│   ├── config.ts           # App configuration
│   ├── constants.ts        # App constants
│   ├── parseLeads.ts       # CSV parsing logic
│   ├── filterLeads.ts      # Filter logic
│   ├── sortLeads.ts        # Sort logic
│   └── exportCsv.ts        # CSV export logic
└── store/
    └── filterStore.ts      # Zustand filter state
```

## Building for Production

```bash
npm run build
npm start
```

## Code Quality

- **Strict TypeScript**: No `any` types allowed
- **Separation of Concerns**: All business logic in `lib/`, components are presentational
- **JSDoc Comments**: All utility functions documented
- **Constants**: All magic strings defined in `lib/constants.ts`
- **Pure Functions**: Filter and sort functions are pure with no side effects

## License

MIT
