# 🎯 How to Create Your First Account

## Important: The Login Page IS Your Signup Page!

There is **NO separate signup page** by design. Here's how to create your first account:

---

## Step 1: Make Sure Database Schema is Loaded ⚠️

**This is CRITICAL - do this FIRST!**

```bash
# 1. Open Supabase Dashboard
# 2. Click "SQL Editor" in the left sidebar
# 3. Click "New query"
# 4. Copy the ENTIRE contents of: supabase-schema.sql
# 5. Paste into the editor
# 6. Click "Run" (or press Ctrl+Enter)
# 7. Wait for "Success. No rows returned" message
```

**Without this step, account creation will fail!**

---

## Step 2: Start Your Application

```bash
npm run dev
```

Visit: http://localhost:3001/login

---

## Step 3: Create Your Account

On the login page:

1. **Enter ANY email and password** (that doesn't exist yet)
   ```
   Email: admin@yourcompany.com
   Password: YourSecurePassword123!
   ```

2. **Click "Sign In"** (yes, it says "Sign In" not "Sign Up"!)

3. **What happens automatically:**
   - ✅ Your account is created
   - ✅ You become an admin
   - ✅ A company is created for you
   - ✅ You're redirected to `/admin/dashboard`

**That's it! You're now an admin! 🎉**

---

## Step 4: Create Workers (Optional)

Now that you're an admin:

1. Navigate to `/admin/workers`
2. Click "Add Worker"
3. Enter worker name and email
4. Copy the temporary password
5. Share password with worker

Workers can then login at `/login` using their credentials.

---

## ❓ FAQ

### Q: Where is the signup page?
**A:** There is no separate signup page. The login page handles both login AND signup automatically.

### Q: How does it know if I'm signing up vs logging in?
**A:** 
- If your email exists → You login
- If your email doesn't exist → Account is created automatically
- First account created → Becomes admin with company
- Additional accounts → Must be created by admin (no self-registration)

### Q: What if I try to login with wrong password?
**A:** You'll get "Invalid login credentials" error. Enter correct password to login.

### Q: Can workers sign up themselves?
**A:** No! By design, workers CANNOT self-register. Only admins can create worker accounts.

### Q: What if I want to create a second admin?
**A:** Login as first admin, create a worker account, then change their role in database:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'second-admin@example.com';
```

---

## 🐛 Troubleshooting

### Issue: "Profile not found"

**Cause:** Database schema not loaded

**Fix:**
```bash
# Go to Supabase Dashboard → SQL Editor
# Run the entire supabase-schema.sql file
# Try creating account again
```

### Issue: "No company assigned"

**Cause:** Trigger didn't fire correctly

**Fix:**
```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'your@email.com';

-- Check if profile exists
SELECT * FROM profiles WHERE email = 'your@email.com';

-- If profile exists but no company_id, delete and retry:
DELETE FROM profiles WHERE email = 'your@email.com';
-- Then delete from Supabase Dashboard → Authentication → Users
-- Try signup again
```

### Issue: "Account created but profile not found"

**Cause:** Trigger needs more time to complete

**Fix:** Just login again with the same credentials.

---

## 🚨 Google OAuth Note

The Google OAuth error you saw is because:
1. You need to configure redirect URLs in Google Cloud Console
2. The redirect URL must exactly match

**To fix Google OAuth:**

1. **Google Cloud Console:**
   - Go to: https://console.cloud.google.com/
   - Select your project
   - Navigate to: APIs & Services → Credentials
   - Click on your OAuth 2.0 Client ID
   - Add Authorized redirect URI:
     ```
     https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
     ```
   - Save

2. **Supabase Dashboard:**
   - Go to: Authentication → Providers → Google
   - Enable Google provider
   - Enter your Client ID and Secret
   - Add redirect URL in Site URL section:
     ```
     http://localhost:3001/auth/callback
     ```

**OR** just use email/password for now and skip Google OAuth!

---

## ✅ Quick Test

1. Visit: http://localhost:3001/login
2. Enter: `test@example.com` / `TestPassword123!`
3. Click "Sign In"
4. Should redirect to: `/admin/dashboard`
5. You're now an admin! ✨

---

## 📝 Summary

- ✅ Login page = Signup page (one form for both)
- ✅ First account = Admin automatically
- ✅ Database schema MUST be loaded first
- ✅ Workers created by admins only
- ✅ Google OAuth is optional (use email/password)

---

**Ready to create your account?**

1. Load database schema
2. Start app: `npm run dev`
3. Visit: http://localhost:3001/login
4. Enter new email/password
5. Click "Sign In"
6. Become admin! 🎉
