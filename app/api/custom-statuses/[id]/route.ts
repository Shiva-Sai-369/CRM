import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * PUT /api/custom-statuses/[id]
 * Update a custom status
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusId = parseInt(params.id);
    if (isNaN(statusId)) {
      return NextResponse.json({ error: 'Invalid status ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, color, background_color, is_active } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (background_color !== undefined) updateData.background_color = background_color;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Validate color format if provided
    if (color || background_color) {
      const hexColorPattern = /^#[0-9A-F]{6}$/i;
      if (color && !hexColorPattern.test(color)) {
        return NextResponse.json(
          { error: 'Color must be valid hex format (e.g., #FF0000)' },
          { status: 400 }
        );
      }
      if (background_color && !hexColorPattern.test(background_color)) {
        return NextResponse.json(
          { error: 'Background color must be valid hex format (e.g., #FF0000)' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await (supabase
      .from('custom_statuses') as any)
      .update(updateData)
      .eq('id', statusId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') { // unique violation
        return NextResponse.json(
          { error: 'A status with this name already exists for this project' },
          { status: 409 }
        );
      }
      console.error('[custom-statuses] Error updating custom status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json({ status: data });
  } catch (error) {
    console.error('[custom-statuses] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/custom-statuses/[id]
 * Delete a custom status (soft delete by setting is_active = false)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusId = parseInt(params.id);
    if (isNaN(statusId)) {
      return NextResponse.json({ error: 'Invalid status ID' }, { status: 400 });
    }

    // Soft delete by setting is_active = false
    const { data, error } = await (supabase
      .from('custom_statuses') as any)
      .update({ is_active: false })
      .eq('id', statusId)
      .select('*')
      .single();

    if (error) {
      console.error('[custom-statuses] Error deleting custom status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('[custom-statuses] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}