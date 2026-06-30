-- =====================================================
-- CRM Database Schema with Row Level Security
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PROFILES TABLE (linked to auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profiles_company_id_required CHECK (company_id IS NOT NULL)
);

-- =====================================================
-- 3. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_worker UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    lead_status TEXT DEFAULT 'New Lead',
    lead_source TEXT,
    tags TEXT[],
    notes TEXT,
    platform TEXT,
    last_message TEXT,
    last_message_date TIMESTAMPTZ,
    -- Additional Facebook/Instagram fields
    ad_name TEXT,
    campaign_name TEXT,
    form_name TEXT,
    education_level TEXT,
    adset_name TEXT,
    campaign_id TEXT,
    adset_id TEXT,
    ad_id TEXT,
    form_id TEXT,
    is_organic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_worker ON customers(assigned_worker);
CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);

-- =====================================================
-- 4. ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_worker ON activity_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_customer ON activity_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- =====================================================
-- 5. TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_worker UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_worker ON tasks(assigned_worker);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create profile on user signup
-- =====================================================

-- Helper function to check if this is the first user in the system
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM profiles) = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main trigger function for new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_is_first_user BOOLEAN;
    v_new_company_id UUID;
    v_role TEXT;
    v_company_id UUID;
BEGIN
    -- Check if this is the first user
    v_is_first_user := is_first_user();
    
    -- Determine role from metadata (explicitly set by admin creating worker)
    -- or make first user an admin
    v_role := NEW.raw_user_meta_data->>'role';
    v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    
    -- First user becomes admin with new company
    IF v_is_first_user THEN
        -- Create a new company for the first user
        INSERT INTO companies (company_name)
        VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'))
        RETURNING id INTO v_new_company_id;
        
        -- Insert admin profile
        INSERT INTO profiles (id, company_id, full_name, email, avatar_url, role)
        VALUES (
            NEW.id,
            v_new_company_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Admin User'),
            NEW.email,
            NEW.raw_user_meta_data->>'avatar_url',
            'admin'
        );
    ELSE
        -- For subsequent users, role and company_id MUST be provided by admin
        -- This prevents self-registration
        IF v_role IS NULL OR v_company_id IS NULL THEN
            RAISE EXCEPTION 'New users must be created by an administrator';
        END IF;
        
        -- Insert worker profile with admin-provided company_id
        INSERT INTO profiles (id, company_id, full_name, email, avatar_url, role)
        VALUES (
            NEW.id,
            v_company_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Worker'),
            NEW.email,
            NEW.raw_user_meta_data->>'avatar_url',
            v_role
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update company profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Admins can update company" ON companies;

DROP POLICY IF EXISTS "Admins can view all customers" ON customers;
DROP POLICY IF EXISTS "Workers can view assigned customers" ON customers;
DROP POLICY IF EXISTS "Admins can create customers" ON customers;
DROP POLICY IF EXISTS "Admins can update all customers" ON customers;
DROP POLICY IF EXISTS "Workers can update assigned customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Workers can view own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can create activity logs" ON activity_logs;

DROP POLICY IF EXISTS "Admins can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Workers can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can update all tasks" ON tasks;
DROP POLICY IF EXISTS "Workers can update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all profiles in their company
CREATE POLICY "Admins can view company profiles"
    ON profiles FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert profiles in their company
CREATE POLICY "Admins can create profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update profiles in their company
CREATE POLICY "Admins can update company profiles"
    ON profiles FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete profiles in their company (except themselves)
CREATE POLICY "Admins can delete profiles"
    ON profiles FOR DELETE
    USING (
        id != auth.uid() AND
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- COMPANIES POLICIES
-- =====================================================

-- Users can view their own company
CREATE POLICY "Users can view own company"
    ON companies FOR SELECT
    USING (
        id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Admins can update their company
CREATE POLICY "Admins can update company"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- CUSTOMERS POLICIES
-- =====================================================

-- Admins can view all customers in their company
CREATE POLICY "Admins can view all customers"
    ON customers FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers can view only assigned customers
CREATE POLICY "Workers can view assigned customers"
    ON customers FOR SELECT
    USING (
        assigned_worker = auth.uid() OR
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert customers
CREATE POLICY "Admins can create customers"
    ON customers FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all customers
CREATE POLICY "Admins can update all customers"
    ON customers FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers can update assigned customers
CREATE POLICY "Workers can update assigned customers"
    ON customers FOR UPDATE
    USING (
        assigned_worker = auth.uid() AND
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers"
    ON customers FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- ACTIVITY LOGS POLICIES
-- =====================================================

-- Admins can view all activity logs in their company
CREATE POLICY "Admins can view all activity logs"
    ON activity_logs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers can view their own activity logs
CREATE POLICY "Workers can view own activity logs"
    ON activity_logs FOR SELECT
    USING (
        worker_id = auth.uid() OR
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Anyone authenticated can insert activity logs
CREATE POLICY "Users can create activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- TASKS POLICIES
-- =====================================================

-- Admins can view all tasks in their company
CREATE POLICY "Admins can view all tasks"
    ON tasks FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers can view their assigned tasks
CREATE POLICY "Workers can view assigned tasks"
    ON tasks FOR SELECT
    USING (
        assigned_worker = auth.uid() OR
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can create tasks
CREATE POLICY "Admins can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all tasks
CREATE POLICY "Admins can update all tasks"
    ON tasks FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers can update their assigned tasks
CREATE POLICY "Workers can update assigned tasks"
    ON tasks FOR UPDATE
    USING (
        assigned_worker = auth.uid() AND
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only admins can delete tasks
CREATE POLICY "Admins can delete tasks"
    ON tasks FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- HELPFUL FUNCTIONS
-- =====================================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user company
CREATE OR REPLACE FUNCTION get_user_company()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT company_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Create a demo company
-- INSERT INTO companies (id, company_name)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company');

-- Note: To create your first admin user:
-- 1. Sign up through the application
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Find your user and copy the UUID
-- 4. Run this SQL (replace YOUR_USER_ID and YOUR_COMPANY_ID):
--
-- UPDATE profiles 
-- SET role = 'admin', company_id = 'YOUR_COMPANY_ID' 
-- WHERE id = 'YOUR_USER_ID';
