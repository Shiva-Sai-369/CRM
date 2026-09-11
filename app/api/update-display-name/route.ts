/**
 * POST /api/update-display-name
 * Any authenticated user can update their own display name.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let displayName: string;
  try {
    const body = await request.json() as { displayName?: string };
    if (typeof body.displayName !== 'string') {
      return NextResponse.json({ error: 'Invalid displayName' }, { status: 400 });
    }
    displayName = body.displayName.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate display name
  if (!displayName) {
    return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 });
  }

  if (displayName.length > 100) {
    return NextResponse.json({ error: 'Display name must be 100 characters or less' }, { status: 400 });
  }

  // Update profile
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ full_name: displayName })
    .eq('id', user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Display name updated successfully',
    displayName,
  }, { status: 200 });
}
