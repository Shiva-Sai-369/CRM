import { NextRequest, NextResponse } from 'next/server';

/**
 * Test CSV parsing without saving to database
 * POST with { csvUrl: "your-url" }
 */

interface SheetRow {
  Name?: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Status?: string;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvUrl } = body;

    if (!csvUrl) {
      return NextResponse.json({ error: 'csvUrl is required' }, { status: 400 });
    }

    // Fetch CSV
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const csvText = await response.text();
    
    // Parse CSV
    const rows = parseCSV(csvText);

    // Analyze the data
    const analysis = {
      totalLength: csvText.length,
      firstChars: csvText.substring(0, 300),
      totalRows: rows.length,
      headers: rows.length > 0 ? Object.keys(rows[0]) : [],
      firstThreeRows: rows.slice(0, 3),
      columnAnalysis: analyzeColumns(rows),
      potentialIssues: detectIssues(rows),
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[test-csv-parse] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

function analyzeColumns(rows: SheetRow[]) {
  if (rows.length === 0) return {};

  const headers = Object.keys(rows[0]);
  const analysis: Record<string, any> = {};

  headers.forEach(header => {
    const nonEmptyCount = rows.filter(row => {
      const val = row[header];
      return val && val.trim() !== '';
    }).length;

    const fillRate = (nonEmptyCount / rows.length) * 100;

    analysis[header] = {
      fillRate: fillRate.toFixed(1) + '%',
      nonEmptyCount: nonEmptyCount,
      totalCount: rows.length,
      sampleValues: rows
        .filter(row => row[header] && row[header].trim() !== '')
        .slice(0, 3)
        .map(row => row[header]),
    };
  });

  return analysis;
}

function detectIssues(rows: SheetRow[]): string[] {
  const issues: string[] = [];

  if (rows.length === 0) {
    issues.push('❌ No data rows found (only header or completely empty)');
    return issues;
  }

  const headers = Object.keys(rows[0]);

  // Check if this is Facebook Lead Ads format
  const isFacebookFormat = headers.includes('field_data') && headers.includes('created_time');
  
  if (isFacebookFormat) {
    issues.push('ℹ️ Detected Facebook Lead Ads format');
    
    // Check if field_data is parseable
    const firstRow = rows[0];
    if (firstRow.field_data) {
      try {
        const parsed = JSON.parse(firstRow.field_data as string);
        if (Array.isArray(parsed)) {
          const fieldNames = parsed.map((f: any) => f.name).join(', ');
          issues.push(`✅ Facebook fields detected: ${fieldNames}`);
        } else {
          issues.push('⚠️ field_data is not in expected array format');
        }
      } catch {
        issues.push('❌ field_data is not valid JSON');
      }
    }
    
    return issues;
  }

  // Standard format checks
  const hasName = headers.some(h => /^(name|full_name)$/i.test(h));
  const hasEmail = headers.some(h => /^(email|e-mail)$/i.test(h));
  const hasPhone = headers.some(h => /^(phone|phone_number|mobile)$/i.test(h));

  if (!hasName) {
    issues.push('⚠️ No "Name" or "full_name" column found');
  }
  if (!hasEmail) {
    issues.push('⚠️ No "Email" column found');
  }
  if (!hasPhone) {
    issues.push('⚠️ No "Phone" or "phone_number" column found');
  }

  if (!hasName && !hasEmail && !hasPhone) {
    issues.push('❌ CRITICAL: Missing all required columns (Name, Email, Phone)');
  }

  // Check if all rows are empty
  const allRowsEmpty = rows.every(row => {
    return Object.values(row).every(val => !val || val.trim() === '');
  });

  if (allRowsEmpty) {
    issues.push('❌ CRITICAL: All rows are completely empty');
  }

  // Check for mostly empty data
  const nameColumn = headers.find(h => /^(name|full_name)$/i.test(h));
  const emailColumn = headers.find(h => /^(email)$/i.test(h));
  const phoneColumn = headers.find(h => /^(phone|phone_number)$/i.test(h));

  if (nameColumn) {
    const filledNames = rows.filter(row => row[nameColumn] && row[nameColumn].trim() !== '');
    if (filledNames.length === 0) {
      issues.push(`❌ Name column "${nameColumn}" exists but all values are empty`);
    }
  }

  if (emailColumn) {
    const filledEmails = rows.filter(row => row[emailColumn] && row[emailColumn].trim() !== '');
    if (filledEmails.length === 0) {
      issues.push(`❌ Email column "${emailColumn}" exists but all values are empty`);
    }
  }

  if (phoneColumn) {
    const filledPhones = rows.filter(row => row[phoneColumn] && row[phoneColumn].trim() !== '');
    if (filledPhones.length === 0) {
      issues.push(`❌ Phone column "${phoneColumn}" exists but all values are empty`);
    }
  }

  // Check for encoding issues
  const hasWeirdChars = rows.some(row => {
    return Object.values(row).some(val => {
      if (typeof val === 'string') {
        return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(val);
      }
      return false;
    });
  });

  if (hasWeirdChars) {
    issues.push('⚠️ Possible encoding issues detected (special characters)');
  }

  if (issues.length === 0) {
    issues.push('✅ No obvious issues detected! Data looks good.');
  }

  return issues;
}
