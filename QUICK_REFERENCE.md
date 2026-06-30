# 📋 Quick Reference Card

## 🎯 Your Supabase Project

| Item | Value |
|------|-------|
| **Project ID** | `grlwnzlxvolzwdyejaji` |
| **Project URL** | `https://grlwnzlxvolzwdyejaji.supabase.co` |
| **Dashboard** | [supabase.com/dashboard](https://app.supabase.com/) |

---

## 🔑 Environment Variables Needed

### Current `.env.local` Status
```bash
NEXT_PUBLIC_SUPABASE_URL=https://grlwnzlxvolzwdyejaji.supabase.co ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here ❌ NEEDS UPDATE
NEXT_PUBLIC_SITE_URL=http://localhost:3000 ✅
```

### ❌ What's Missing?
- **Anon Key** - Get from Supabase Dashboard → Settings → API → Anon public

---

## 📍 Key Locations

| Task | Location |
|------|----------|
| **Anon Key** | Supabase → Settings → API |
| **Google OAuth** | Supabase → Authentication → Providers → Google |
| **SQL Editor** | Supabase → SQL Editor |
| **Tables** | Supabase → Table Editor |
| **Users** | Supabase → Authentication → Users |

---

## 🔐 What Needs Google OAuth Setup?

| Item | Where to Get |
|------|--------------|
| **Client ID** | Google Cloud Console → Credentials |
| **Client Secret** | Google Cloud Console → Credentials |
| **Redirect URIs** | Add to Google Cloud Console AND Supabase |

### Redirect URIs You Need:
```
https://grlwnzlxvolzwdyejaji.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

---

## 🚀 Commands You'll Need

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🧪 Quick Test Flow

```
1. npm run dev
2. Go to http://localhost:3000
3. Select "Worker" button
4. Enter test email/password
5. Should see dashboard ✅

Then test Google OAuth:
1. Click "Continue with Google"
2. Login with Google
3. Should see dashboard ✅
```

---

## 🎨 What Changed on Login Page

**Before:**
```
┌─────────────────────┐
│  Email: [__]        │
│  Password: [__]     │
│  [Sign In]          │
│  [Google Button]    │
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│ [Admin] [Worker] ← NEW
│ Email: [__]        │
│ Password: [__]     │
│ [Sign In]          │
│ [Google Button]    │
└─────────────────────┘
```

---

## 📁 Important Files

| File | Purpose | Status |
|------|---------|--------|
| `.env.local` | Environment variables | ⚠️ Needs Anon Key |
| `supabase-schema.sql` | Database tables | ⏳ Needs to run |
| `app/login/page.tsx` | Login page | ✅ Updated |
| `lib/supabase/client.ts` | Supabase config | ✅ Ready |

---

## ⚡ 30-Second Setup

1. Get Anon Key from Supabase → Settings → API
2. Update `.env.local` with your key
3. Run `supabase-schema.sql` in Supabase SQL Editor
4. Run `npm run dev`
5. Test login!

---

## 🔴 Common Errors & Quick Fixes

| Error | Fix |
|-------|-----|
| "Cannot find Supabase module" | Run `npm install` |
| "Invalid Client" (Google) | Check Client ID/Secret in Supabase |
| "redirect_uri_mismatch" | Add URIs to Google Console |
| Blank page on login | Check `.env.local` has values |
| "Unauthorized" error | Verify Anon Key in `.env.local` |

---

## 📞 What to Share If Stuck

When something doesn't work, share:
1. The exact error message you see
2. Where you see it (browser console? page? terminal?)
3. What step you're on
4. What you did just before the error

---

## ✅ Success Checklist

- [ ] `.env.local` has real Anon Key
- [ ] `npm run dev` starts without errors
- [ ] Login page shows Admin/Worker buttons
- [ ] Email/password login works
- [ ] Google OAuth button works
- [ ] Both roles can login
- [ ] Redirects to correct dashboard

---

## 🎯 Next Steps

1. **Update `.env.local`** with your Anon Key
2. **Run database schema** in Supabase
3. **Test locally** with `npm run dev`
4. **Report any errors** and I'll fix them
5. **Deploy** when everything works!

---

## 💬 Questions?

Check these files:
- `SETUP_CHECKLIST.md` - Step-by-step guide
- `GOOGLE_OAUTH_TROUBLESHOOTING.md` - OAuth specific help
- `RECENT_UPDATES.md` - What changed
- `SUPABASE_SETUP.md` - Detailed everything

---

**Ready? Start with:** `npm run dev` → Go to `http://localhost:3000`
