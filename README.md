# CRM — Lead Management Tool

Internal CRM for a digital marketing agency. View and filter leads from Google Sheets.

Built with Next.js 14, TypeScript, Tailwind CSS, and Zustand.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State**: Zustand (filter state)
- **Data source**: Google Sheets via Apps Script proxy
- **Utilities**: papaparse, date-fns, react-hot-toast

## Project Structure

- `/app` — Next.js pages (enquiries, settings)
- `/components` — UI components (filters, tables, badges)
- `/lib` — business logic, data fetching, parsing utilities
- `/store` — Zustand state management
- `/docs` — Google Apps Script code (for manual deployment)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Deploy Google Apps Script:**
   - Open your Google Sheet with lead data
   - Follow instructions in `/docs/google-apps-script.js`
   - Copy the deployed Web App URL

3. **Configure the app:**
   - Run `npm run dev`
   - Go to Settings page
   - Paste your Apps Script URL
   - Test and Save

4. **Start using:**
   - Go to Enquiries page
   - Click Refresh to load leads
   - Use filters to narrow down results

## Features

- ✅ Real-time Google Sheets data fetching
- ✅ Advanced filtering (status, tags, date ranges, search)
- ✅ Lead statistics dashboard
- ✅ CSV export
- ✅ Responsive design

## Current Status

- ✅ Google Apps Script integration working
- ✅ Lead display, filtering, sorting, export
- ⏳ Authentication not implemented yet (coming later)
- ⏳ Supabase integration not implemented yet (coming later)

## Future Enhancements

- [ ] User authentication
- [ ] Supabase database integration
- [ ] Role-based access control
- [ ] Lead assignment & tracking
- [ ] Activity logs
