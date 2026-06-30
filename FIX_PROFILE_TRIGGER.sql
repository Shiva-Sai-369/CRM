-- =====================================================
-- FIX: Update the profile creation trigger
-- =====================================================
-- Run this SQL in Supabase SQL Editor to fix the issue
-- This allows creating profiles without a company_id initially
-- =====================================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Modify the profiles table to make company_id nullable
ALTER TABLE profiles 
ALTER COLUMN company_id DROP NOT NULL;

-- Create the improved trigger that handles the company_id being null
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url, role, company_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
        NULL  -- company_id can be NULL initially, will be set later
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Done! Now profiles will be created successfully
-- After creating the user, you can update their company_id via Supabase UI
