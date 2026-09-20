-- Create custom_statuses table
CREATE TABLE custom_statuses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#F3F4F6', -- Hex color code
  background_color VARCHAR(7) NOT NULL DEFAULT '#374151', -- Hex background color
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate status names per project
CREATE UNIQUE INDEX custom_statuses_project_name_unique 
ON custom_statuses(project_id, LOWER(name)) 
WHERE is_active = true;

-- Create index for better performance
CREATE INDEX custom_statuses_project_id_idx ON custom_statuses(project_id);
CREATE INDEX custom_statuses_is_active_idx ON custom_statuses(is_active);

-- Enable RLS
ALTER TABLE custom_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view custom statuses for their assigned projects" ON custom_statuses
FOR SELECT USING (
  -- Super admins can see all
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR
  -- Users can see statuses from projects they're assigned to
  project_id IN (
    SELECT project_id 
    FROM project_assignments 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert custom statuses for their assigned projects" ON custom_statuses
FOR INSERT WITH CHECK (
  -- Super admins can insert for any project
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR
  -- Users can insert for projects they're assigned to
  project_id IN (
    SELECT project_id 
    FROM project_assignments 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update custom statuses for their assigned projects" ON custom_statuses
FOR UPDATE USING (
  -- Super admins can update any
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR
  -- Users can update statuses from projects they're assigned to
  project_id IN (
    SELECT project_id 
    FROM project_assignments 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete custom statuses for their assigned projects" ON custom_statuses
FOR DELETE USING (
  -- Super admins can delete any
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR
  -- Users can delete statuses from projects they're assigned to
  project_id IN (
    SELECT project_id 
    FROM project_assignments 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_statuses_updated_at 
BEFORE UPDATE ON custom_statuses 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();