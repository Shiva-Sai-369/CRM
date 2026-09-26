import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import Papa from 'papaparse';
import { fetchPublishedSheetCsv, SheetFetchError } from '@/lib/googleSheets';
import { getMissingColumnsMessage, mapSheetColumns, readLeadFields } from '@/lib/sheetColumns';

/**
 * API Route: POST /api/sync-sheet-to-supabase
 * 
 * Syncs Google Sheets data to Supabase.
 * Accepts: { sheetUrl: string, projectId: number, sheetName: string }
 * 
 * Process:
 * 1. Fetch data from Google Sheets CSV URL
 * 2. Create/update google_sheets entry
 * 3. Insert leads into sheet_leads table
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { sheetUrl, projectId, sheetName } = body;

    if (!sheetUrl || !projectId || !sheetName) {
      return NextResponse.json(
        { error: 'Missing required fields: sheetUrl, projectId, sheetName' },
        { status: 400 }
      );
    }

    // Fetch data from Google Sheets. Only published-CSV links on docs.google.com are allowed
    // (this is a server-side fetch of a caller-supplied URL); see lib/googleSheets.ts.
    let csvText: string;
    try {
      csvText = await fetchPublishedSheetCsv(sheetUrl);
    } catch (fetchError) {
      if (fetchError instanceof SheetFetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 400 });
      }
      throw fetchError;
    }

    console.log('[sync] CSV text length:', csvText.length);
    
    // Parse CSV using Papa.parse (handles quoted fields with commas correctly)
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    const rows = parseResult.data;
    
    console.log('[sync] Parsed rows count:', rows.length);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in sheet' },
        { status: 400 }
      );
    }

    // Map the header row once; every row is then read through the same mapping.
    const headers = parseResult.meta.fields ?? [];
    const mapping = mapSheetColumns(headers);
    const missingColumnsMessage = getMissingColumnsMessage(mapping, headers);
    if (missingColumnsMessage) {
      return NextResponse.json({ error: missingColumnsMessage }, { status: 400 });
    }

    // Check if google_sheets entry already exists
    const { data: existingSheet } = await supabase
      .from('google_sheets')
      .select('id')
      .eq('project_id', projectId)
      .eq('spreadsheet_id', sheetUrl)
      .maybeSingle();

    let sheetId: number;

    if (existingSheet) {
      // Update existing sheet
      sheetId = (existingSheet as any).id;
      const updateResult = await (supabase
        .from('google_sheets') as any)
        .update({
          name: sheetName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId);
    } else {
      // Create new google_sheets entry
      const now = new Date().toISOString();
      const { data: newSheet, error: sheetError } = await (supabase
        .from('google_sheets') as any)
        .insert({
          project_id: projectId,
          name: sheetName,
          sheet_name: sheetName,
          spreadsheet_id: sheetUrl,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (sheetError || !newSheet) {
        throw new Error(`Failed to create google_sheets entry: ${sheetError?.message}`);
      }

      sheetId = newSheet.id;
    }

    // Auto-assign current user to project for access (if not already assigned)
    const { data: existingAssignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (!existingAssignment) {
      const { error: assignError } = await (supabase
        .from('project_assignments') as any)
        .insert({
          user_id: user.id,
          project_id: projectId,
          created_at: new Date().toISOString()
        });
      
      if (assignError) {
        console.warn('[sync-sheet-to-supabase] Failed to auto-assign project:', assignError.message);
        // Don't fail the sync, just log the warning
      } else {
        console.log('[sync-sheet-to-supabase] Auto-assigned user to project:', projectId);
      }
    }

    // Get existing leads to avoid duplicates
    const { data: existingLeads } = await (supabase
      .from('sheet_leads') as any)
      .select('email, phone')
      .eq('sheet_id', sheetId);

    console.log('[sync] Existing leads count:', existingLeads?.length || 0);
    
    const existingEmails = new Set((existingLeads as any)?.map((l: any) => l.email?.toLowerCase()) || []);
    const existingPhones = new Set((existingLeads as any)?.map((l: any) => l.phone) || []);

    // Prepare leads for insertion
    const leadsToInsert: any[] = [];
    let rowNumber = (existingLeads?.length || 0) + 1;
    let duplicateCount = 0;
    let emptyRowCount = 0;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      const fields = readLeadFields(row, mapping);
      const name = fields.name || null;
      const email = fields.email.toLowerCase() || null;
      const phone = fields.phone || null;
      const company = fields.company || null;
      const status = (fields.status || 'new').toLowerCase();
      const createdAt = fields.date || new Date().toISOString();

      // Skip completely empty rows
      if (!email && !phone && !name) {
        emptyRowCount++;
        continue;
      }

      // Skip if duplicate
      if (email && existingEmails.has(email)) {
        duplicateCount++;
        // console.log(`[sync] Row ${rowIndex} skipped: duplicate email: ${email}`);
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        duplicateCount++;
        // console.log(`[sync] Row ${rowIndex} skipped: duplicate phone: ${phone}`);
        continue;
      }

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
        updated_at: createdAt,
      });
    }
    
    
    // Insert leads in batches of 100
    let insertedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);
      const { error: insertError } = await (supabase
        .from('sheet_leads') as any)
        .insert(batch);

      if (insertError) {
        console.error('Batch insert error:', insertError);
        // Continue with next batch even if one fails
      } else {
        insertedCount += batch.length;
      }
    }

    console.log('[sync] ✅ Sync complete:', {
      totalRows: rows.length,
      inserted: insertedCount,
      skipped: rows.length - insertedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${insertedCount} new leads`,
      sheetId,
      totalRows: rows.length,
      insertedRows: insertedCount,
      skippedRows: rows.length - insertedCount,
      duplicates: duplicateCount,
      emptyRows: emptyRowCount,
    });

  } catch (error) {
    console.error('[sync-sheet-to-supabase] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
