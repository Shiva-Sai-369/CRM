import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/custom-statuses?project_id=123
 * Fetch custom statuses for a specific project or all projects
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');

    let query = (supabase
      .from('custom_statuses') as any)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', parseInt(projectId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('[custom-statuses] Error fetching custom statuses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ statuses: data || [] });
  } catch (error) {
    console.error('[custom-statuses] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-statuses
 * Create a new custom status
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, background_color, project_id } = body;

    if (!name || !color || !background_color || !project_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, color, background_color, project_id' },
        { status: 400 }
      );
    }

    // Validate color format (hex colors)
    const hexColorPattern = /^#[0-9A-F]{6}$/i;
    if (!hexColorPattern.test(color) || !hexColorPattern.test(background_color)) {
      return NextResponse.json(
        { error: 'Colors must be valid hex format (e.g., #FF0000)' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase
      .from('custom_statuses') as any)
      .insert({
        name: name.trim(),
        color,
        background_color,
        project_id: parseInt(project_id),
        created_by: user.id,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return NextResponse.json(
          { error: 'A status with this name already exists for this project' },
          { status: 409 }
        );
      }
      console.error('[custom-statuses] Error creating custom status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: data }, { status: 201 });
  } catch (error) {
    console.error('[custom-statuses] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}