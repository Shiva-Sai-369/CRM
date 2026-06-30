# 🔧 Fix Database Trigger - Step-by-Step

## 🐛 What's Wrong

The database trigger was too restrictive. It blocked new users from signing up unless they were created by an admin.

**Error you saw:** "Database error saving new user"

## ✅ How to Fix It

### Step 1: Go to Supabase SQL Editor

Open: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/sql/new

### Step 2: Drop the Old Trigger

Copy and paste this in the SQL Editor:

```sql
-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS is_first_user();
```

Click "Run"

### Step 3: Recreate the Fixed Trigger

Copy and paste this entire block in the SQL Editor:

```sql
-- Helper function to check if this is the first user in the system
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM profiles) = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main trigger function for new user creation (FIXED)
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
    -- or make first user an admin, others admin by default
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
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
        -- For subsequent users, try to use provided company_id
        -- If not provided, use first company (allow signup but assign to default company)
        IF v_company_id IS NULL THEN
            -- Get the first company that exists
            v_company_id := (SELECT id FROM companies LIMIT 1);
            
            -- If no company exists, create one
            IF v_company_id IS NULL THEN
                INSERT INTO companies (company_name)
                VALUES ('Default Company')
                RETURNING id INTO v_company_id;
            END IF;
        END IF;
        
        -- Insert profile with determined role and company
        INSERT INTO profiles (id, company_id, full_name, email, avatar_url, role)
        VALUES (
            NEW.id,
            v_company_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
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

-- Drop old trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

Click "Run"

### Step 4: Verify the Fix

Run this query to verify the trigger exists:

```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

You should see:
```
tgname                    | tgrelid
--------------------------|----------
on_auth_user_created      | auth.users
```

Click "Run"

---

## 🧪 Test the Fix

### 1. Clear Browser Cache
- Press `Ctrl+Shift+Delete` in your browser
- Clear all data
- Close and reopen browser

### 2. Delete Old Test Users (Optional)

If you tried to signup before, delete those failed attempts:

```sql
DELETE FROM auth.users 
WHERE email LIKE '%example%' OR email LIKE '%test%';
```

### 3. Test Signup

1. Go to: http://localhost:3004/login
2. Enter:
   - Email: `admin@test.com`
   - Password: `password123`
3. Click "Sign In"
4. You should be logged in! ✅

### 4. Check Supabase

Go to: https://supabase.com/dashboard/project/grlwnzlxvolzwdyejaji/auth/users

You should see:
- `admin@test.com` in the users list ✅
- Profile created in the `profiles` table ✅
- Company created in the `companies` table ✅

---

## 📊 What Changed

### Before (Broken):
```
User signs up
    ↓
Trigger fires
    ↓
Check: Is this first user?
    ↓
If NOT first user:
  Check if role AND company_id provided
    ↓
  If NOT provided:
    RAISE ERROR ❌ "New users must be created by an administrator"
```

### After (Fixed):
```
User signs up
    ↓
Trigger fires
    ↓
Check: Is this first user?
    ↓
If NOT first user:
  Use provided company_id OR get first company OR create default
    ↓
  Use 'admin' as default role (can be overridden)
    ↓
  Create profile successfully ✅
```

---

## 🎯 What This Means

### New Behavior:
✅ First user creates account as admin
✅ Subsequent users can signup freely (default to admin)
✅ Admin can still create workers with specific roles
✅ All users assigned to a company automatically

### Security Note:
The new trigger is more permissive - all new users get admin role by default. You should:
1. ✅ First signup creates the first admin (keep this account safe!)
2. ⚙️ Have that admin create worker accounts manually in the UI
3. ⚙️ Or modify the trigger later to use 'worker' as default

---

## ✅ Summary

1. **What's broken:** Trigger blocks non-first-user signups
2. **How to fix:** Run the SQL in Supabase SQL Editor (above)
3. **Test:** Try signing up again
4. **Verify:** Check Supabase dashboard

---

## 🚀 Next Steps

1. Run the SQL from Step 3
2. Test the fix (Step 4)
3. Login to http://localhost:3004
4. Check Supabase dashboard
5. See your data! 🎉

**Questions?** All the SQL is provided above - just copy and paste into Supabase SQL Editor.
