import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

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

interface SheetRow {
  Name?: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Status?: string;
  Timestamp?: string;
  Platform?: string;
  [key: string]: any;
}

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

    // Validate CSV URL
    if (!sheetUrl.includes('output=csv') && !sheetUrl.includes('/pub')) {
      return NextResponse.json(
        { error: 'Invalid Google Sheets CSV URL' },
        { status: 400 }
      );
    }

    // Fetch data from Google Sheets
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sheet data: ${response.statusText}` },
        { status: 400 }
      );
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in sheet' },
        { status: 400 }
      );
    }

    // Check if google_sheets entry already exists
    const { data: existingSheet } = await supabase
      .from('google_sheets')
      .select('id')
      .eq('project_id', projectId)
      .eq('sheet_url', sheetUrl)
      .maybeSingle();

    let sheetId: number;

    if (existingSheet) {
      // Update existing sheet
      sheetId = existingSheet.id;
      await supabase
        .from('google_sheets')
        .update({
          name: sheetName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sheetId);
    } else {
      // Create new google_sheets entry
      const { data: newSheet, error: sheetError } = await supabase
        .from('google_sheets')
        .insert({
          project_id: projectId,
          name: sheetName,
          sheet_name: sheetName,
          sheet_url: sheetUrl,
          sheet_id: extractSheetId(sheetUrl) || sheetUrl,
        })
        .select('id')
        .single();

      if (sheetError || !newSheet) {
        throw new Error(`Failed to create google_sheets entry: ${sheetError?.message}`);
      }

      sheetId = newSheet.id;
    }

    // Get existing leads to avoid duplicates
    const { data: existingLeads } = await supabase
      .from('sheet_leads')
      .select('email, phone')
      .eq('sheet_id', sheetId);

    const existingEmails = new Set(existingLeads?.map(l => l.email?.toLowerCase()) || []);
    const existingPhones = new Set(existingLeads?.map(l => l.phone) || []);

    // Prepare leads for insertion
    const leadsToInsert: any[] = [];
    let rowNumber = (existingLeads?.length || 0) + 1;

    for (const row of rows) {
      const email = row.Email?.trim().toLowerCase() || null;
      const phone = row.Phone?.trim() || null;

      // Skip if duplicate
      if (email && existingEmails.has(email)) continue;
      if (phone && existingPhones.has(phone)) continue;

      leadsToInsert.push({
        sheet_id: sheetId,
        name: row.Name?.trim() || null,
        email: email,
        phone: phone,
        company: row.Company?.trim() || null,
        status: (row.Status?.trim().toLowerCase() || 'new'),
        row_number: rowNumber++,
        raw_data: row,
        notified: false,
        created_at: row.Timestamp || new Date().toISOString(),
      });
    }

    // Insert leads in batches of 100
    let insertedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('sheet_leads')
        .insert(batch);

      if (insertError) {
        console.error('Batch insert error:', insertError);
        // Continue with next batch even if one fails
      } else {
        insertedCount += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${insertedCount} new leads`,
      sheetId,
      totalRows: rows.length,
      insertedRows: insertedCount,
      skippedRows: rows.length - insertedCount,
    });

  } catch (error) {
    console.error('[sync-sheet-to-supabase] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Parse CSV text to array of objects
function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: SheetRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    rows.push(row);
  }

  return rows;
}

// Helper: Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(v => v.replace(/^"|"$/g, ''));
}

// Helper: Extract Sheet ID from URL
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
