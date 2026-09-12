# Sync Route CSV Parser Fix - Complete Summary

## Problem
The hand-rolled CSV parser in `app/api/sync-sheet-to-supabase/route.ts` was corrupting rows containing a `field_data` column (Facebook Lead Ads JSON export format). The parser would incorrectly split on commas inside the JSON string, causing:
- Rows to be silently skipped
- No error logging
- Complete sync failures for Facebook Lead Ads data

## Solution Implemented

### 1. Replaced Hand-Rolled CSV Parser with Papa.parse
**Before:** Custom `parseCSV()` and `parseCSVLine()` functions that split on commas
**After:** Papa.parse with `{ header: true, skipEmptyLines: true }` options

This properly handles:
- Quoted fields containing commas
- Complex JSON strings in columns
- All standard CSV edge cases

### 2. Added Facebook field_data Parser
Created `parseFacebookFieldData()` helper function that:
- Accepts both JSON strings and pre-parsed objects (Papa.parse might parse it)
- Converts Facebook's format: `[{"name":"full_name","values":["John Doe"]}, ...]`
- Into flat lookup: `{ full_name: "John Doe", email: "x@y.com", ... }`
- Includes comprehensive error handling with try/catch
- Logs failures with row index and truncated raw data (200 chars max)

### 3. Dual-Format Support
The route now handles BOTH formats:

#### Format A: Facebook Lead Ads (field_data column)
```csv
created_time,id,ad_id,form_id,field_data
2024-01-15,[...],[...],"[{""name"":""full_name"",""values"":[""John Doe""]},{""name"":""email"",""values"":[""john@example.com""]}]"
```

Extraction:
- Detects `row.field_data` presence
- Parses JSON array
- Maps to flat fields: `full_name`, `email`, `phone_number`, `company`
- Logs: "Row X parsed via field_data: {...}"

#### Format B: Standard flat columns
```csv
Name,Email,Phone,Company,Status,Timestamp
John Doe,john@example.com,+1234567890,Acme Corp,new,2024-01-15
```

Extraction:
- Uses direct column access: `row.Name`, `row.Email`, etc.
- Logs: "Row X parsed via flat columns: {...}"

### 4. Enhanced Logging
Added comprehensive console logging for debugging:
- **Per-row parse mode:** "field_data" or "flat columns"
- **Extracted values:** name, email, phone, company logged before insertion
- **Skip reasons:** "empty", "duplicate email", "duplicate phone" with row index
- **Parse failures:** Row index + truncated raw field_data on JSON errors
- **Final summary:** Total rows, inserted, duplicates, empty rows

Example log output:
```
[sync] Row 0 parsed via field_data: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', company: 'Acme Corp' }
[sync] Row 0 adding to insert queue (mode: field_data): { name: 'John Doe', email: 'john@example.com', ... }
[sync] Row 1 skipped: duplicate email: jane@test.com
[sync] Row 2 skipped: empty (mode: field_data)
```

## Files Changed
- `app/api/sync-sheet-to-supabase/route.ts`
  - Added Papa.parse import
  - Replaced `parseCSV()` and `parseCSVLine()` with Papa.parse call
  - Added `parseFacebookFieldData()` helper function
  - Enhanced row processing loop with dual-format support
  - Added detailed per-row logging

## Testing
Verified with test cases covering:
1. ✅ Facebook Lead Ads JSON string format
2. ✅ Already-parsed object format
3. ✅ Malformed JSON (error handling)
4. ✅ Complex values with commas inside field_data
5. ✅ TypeScript compilation succeeds

## What Was NOT Changed
- Google Sheets/sheet_leads insert logic
- Deduplication logic (by email/phone)
- API request/response shape
- Authentication flow
- Project assignment logic
- Batch insertion (100 rows at a time)

## Result
- Facebook Lead Ads CSV exports now sync correctly
- All rows are properly parsed instead of being silently skipped
- Parse failures are visible in console logs
- Standard flat-column CSVs continue to work unchanged
- Full backward compatibility maintained

## Usage
The API endpoint works exactly the same:
```typescript
POST /api/sync-sheet-to-supabase
Body: {
  sheetUrl: "https://docs.google.com/spreadsheets/.../pub?output=csv",
  projectId: 123,
  sheetName: "Facebook Leads"
}
```

Logs will now show clear parsing information for each row, making troubleshooting much easier.
