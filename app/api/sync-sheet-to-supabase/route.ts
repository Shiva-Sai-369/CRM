import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import Papa from 'papaparse';

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
  // Facebook Lead Ads format
  created_time?: string;
  id?: string;
  ad_id?: string;
  form_id?: string;
  field_data?: string; // JSON string containing actual lead data
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
    
    console.log('[sync] CSV text length:', csvText.length);
    console.log('[sync] First 200 chars:', csvText.substring(0, 200));
    
    // Parse CSV using Papa.parse (handles quoted fields with commas correctly)
    const parseResult = Papa.parse<SheetRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    const rows = parseResult.data;
    
    console.log('[sync] Parsed rows count:', rows.length);
    console.log('[sync] First row sample:', rows[0]);

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
      .eq('spreadsheet_id', sheetUrl)
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
      const now = new Date().toISOString();
      const { data: newSheet, error: sheetError } = await supabase
        .from('google_sheets')
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
      const { error: assignError } = await supabase
        .from('project_assignments')
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
    const { data: existingLeads } = await supabase
      .from('sheet_leads')
      .select('email, phone')
      .eq('sheet_id', sheetId);

    console.log('[sync] Existing leads count:', existingLeads?.length || 0);
    
    const existingEmails = new Set(existingLeads?.map(l => l.email?.toLowerCase()) || []);
    const existingPhones = new Set(existingLeads?.map(l => l.phone) || []);
    
    console.log('[sync] Existing emails:', existingEmails.size);
    console.log('[sync] Existing phones:', existingPhones.size);

    // Prepare leads for insertion
    const leadsToInsert: any[] = [];
    let rowNumber = (existingLeads?.length || 0) + 1;
    let duplicateCount = 0;
    let emptyRowCount = 0;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      // Parse lead data - support both standard format and Facebook Lead Ads format
      let email: string | null = null;
      let phone: string | null = null;
      let name: string | null = null;
      let company: string | null = null;
      let status: string = 'new';
      let createdAt: string = new Date().toISOString();
      let parseMode: string = 'unknown';

      // Check if this is Facebook Lead Ads format (has field_data column)
      if (row.field_data) {
        parseMode = 'field_data';
        const flatData = parseFacebookFieldData(row.field_data, rowIndex);
        
        if (flatData) {
          // Extract fields using same alternative names as lib/parseLeads.ts
          email = flatData.email || null;
          phone = flatData.phone_number || null;
          name = flatData.full_name || null;
          company = flatData.company || null;
          
          // Use created_time from row if available
          if (row.created_time) {
            createdAt = row.created_time;
          }
          
          console.log(`[sync] Row ${rowIndex} parsed via field_data:`, { name, email, phone, company });
        } else {
          // Parsing failed, skip this row
          emptyRowCount++;
          continue;
        }
      } else {
        // Standard format - direct columns
        // Support both capital case (Name, Email, Phone) and Facebook format (full_name, email, phone_number)
        parseMode = 'flat';
        
        // Try standard column names first, then Facebook alternative names
        name = row.Name?.trim() || row.full_name?.trim() || null;
        email = (row.Email?.trim() || row.email?.trim())?.toLowerCase() || null;
        
        // Phone might have Facebook prefix like "p:+918367630604" - strip it
        let rawPhone = row.Phone?.trim() || row.phone_number?.trim() || null;
        if (rawPhone && rawPhone.startsWith('p:')) {
          phone = rawPhone.substring(2);
        } else {
          phone = rawPhone;
        }
        
        company = row.Company?.trim() || row.company?.trim() || null;
        status = (row.Status?.trim() || row.lead_status?.trim() || 'new').toLowerCase();
        createdAt = row.Timestamp || row.created_time || new Date().toISOString();
        
        console.log(`[sync] Row ${rowIndex} parsed via flat columns:`, { name, email, phone, company });
      }

      // Skip completely empty rows
      if (!email && !phone && !name) {
        console.log(`[sync] Row ${rowIndex} skipped: empty (mode: ${parseMode})`);
        emptyRowCount++;
        continue;
      }

      // Skip if duplicate
      if (email && existingEmails.has(email)) {
        duplicateCount++;
        console.log(`[sync] Row ${rowIndex} skipped: duplicate email: ${email}`);
        continue;
      }
      if (phone && existingPhones.has(phone)) {
        duplicateCount++;
        console.log(`[sync] Row ${rowIndex} skipped: duplicate phone: ${phone}`);
        continue;
      }

      // Log before insertion
      console.log(`[sync] Row ${rowIndex} adding to insert queue (mode: ${parseMode}):`, {
        name,
        email,
        phone,
        company,
        status,
      });

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
    
    console.log('[sync] Leads to insert:', leadsToInsert.length);
    console.log('[sync] Duplicates skipped:', duplicateCount);
    console.log('[sync] Empty rows skipped:', emptyRowCount);
    console.log('[sync] Sample lead to insert:', leadsToInsert[0]);

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

/**
 * Parse Facebook Lead Ads field_data JSON format
 * 
 * Format: [{"name":"full_name","values":["John Doe"]},{"name":"email","values":["x@y.com"]}]
 * 
 * @param fieldDataStr - JSON string or already-parsed object
 * @param rowIndex - Row index for error logging
 * @returns Flat object with field names as keys, or null if parsing fails
 */
function parseFacebookFieldData(fieldDataStr: any, rowIndex: number): Record<string, string> | null {
  try {
    let fieldData;
    
    // field_data might already be parsed as an object by Papa.parse
    if (typeof fieldDataStr === 'string') {
      fieldData = JSON.parse(fieldDataStr);
    } else if (typeof fieldDataStr === 'object') {
      fieldData = fieldDataStr;
    } else {
      console.error(`[sync] Row ${rowIndex}: field_data has unexpected type:`, typeof fieldDataStr);
      return null;
    }
    
    // Convert array format to flat lookup object
    if (!Array.isArray(fieldData)) {
      console.error(`[sync] Row ${rowIndex}: field_data is not an array after parsing`);
      return null;
    }
    
    const flatData: Record<string, string> = {};
    
    for (const field of fieldData) {
      if (!field.name) continue;
      
      const fieldName = field.name;
      const fieldValue = Array.isArray(field.values) ? field.values[0] : field.values || '';
      
      flatData[fieldName] = String(fieldValue).trim();
    }
    
    return flatData;
    
  } catch (error) {
    const truncated = String(fieldDataStr).substring(0, 200);
    console.error(
      `[sync] Row ${rowIndex}: Failed to parse field_data:`,
      error instanceof Error ? error.message : error,
      '\nRaw field_data (truncated):', truncated
    );
    return null;
  }
}
