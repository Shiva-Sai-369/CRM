# Sync Route updated_at Fix

## Problem
Leads were being correctly parsed (42 of 43 rows) but the batch insert failed with:
```
Error 23502: null value in column "updated_at" of relation "sheet_leads" violates not-null constraint
```

## Root Cause
The `sheet_leads` table has a NOT NULL constraint on the `updated_at` column, but the insert payload in `app/api/sync-sheet-to-supabase/route.ts` was only setting `created_at`, not `updated_at`.

## Fix Applied
Added `updated_at` field to the insert object, set to the same timestamp as `created_at`:

```typescript
leadsToInsert.push({
  sheet_id: sheetId,
  name: name,
  email: email,
  phone: phone,
  company: company,
  status: status,
  row_number: rowNumber++,
  raw_data: row,
  notified: false,
  created_at: createdAt,
  updated_at: createdAt,  // ← ADDED THIS LINE
});
```

## Expected Results
When you re-run the sync against the same sheet:
- ✅ **insertedCount should be 42** (not 0)
- ✅ **Row 7 should still be skipped** as empty (correct behavior - it genuinely had no name/email/phone)
- ✅ No more database constraint errors

## Schema Verification
Based on code analysis, the `sheet_leads` table columns being set are:
- `sheet_id` - foreign key ✓
- `name` - text ✓
- `email` - text ✓
- `phone` - text ✓
- `company` - text ✓
- `status` - text ✓
- `row_number` - integer ✓
- `raw_data` - jsonb ✓
- `notified` - boolean ✓
- `created_at` - timestamp ✓
- `updated_at` - timestamp ✓ (NOW FIXED)

All required NOT NULL fields should now be covered. If there are other NOT NULL columns without defaults, they would have shown up in the logs, but none were found in the codebase.

## Status
✅ Fix applied and ready to test
🔄 Dev server running on http://localhost:3001
📝 Please re-run the sync and confirm insertedCount = 42
