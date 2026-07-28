# 🚀 Render Deployment - Step-by-Step Guide

## Get Your Service Ready

### Step 1: Go to Render Dashboard
- Open https://render.com/dashboard
- Find your service "uxplore-flask"
- Click on it to open

---

## ➕ ADD POSTGRESQL DATABASE (REQUIRED!)

### Step 2: Click "+ New" Button
```
In your Render dashboard:
┌─────────────────────────────────────────────────────┐
│  Dashboard  > uxplore-flask (your service)          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Settings]  [Environment]  [Deployments]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Look for: [+ New] button in top right             │
│            Click this!                             │
└─────────────────────────────────────────────────────┘
```

### Step 3: Select PostgreSQL
```
After clicking "+ New":
┌──────────────────────────────────┐
│  What do you want to deploy?     │
├──────────────────────────────────┤
│  [x] Web Service                 │
│  [ ] PostgreSQL                  │ ← CLICK THIS
│  [ ] Redis                       │
│  [ ] MySQL                       │
└──────────────────────────────────┘
```

### Step 4: Fill in Database Details
```
┌─────────────────────────────────────────────┐
│  Create a new PostgreSQL Database           │
├─────────────────────────────────────────────┤
│  Name:          uxplore-postgres            │
│  Database:      uxplore                     │
│  User:          postgres                    │
│  Region:        Virginia (US East)          │
│  PostgreSQL Version: 15                     │
│  Plan:          Free / Free (Starter)       │
│                                             │
│          [Create Database]                  │
└─────────────────────────────────────────────┘
```

### Step 5: Wait for Database to Create
- Click "Create Database"
- Wait 30-60 seconds
- You'll see "✅ Database Created"

---

## 🔐 SET ENVIRONMENT VARIABLES

### Step 6: Go to Environment Variables
```
After database is created:
┌─────────────────────────────────────────────────────┐
│  Dashboard  > uxplore-flask (your service)          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Settings]  [Environment]  [Deployments]  │   │
│  └─────────────────────────────────────────────┘   │
│                   ↑                                 │
│        Click [Environment] tab                     │
└─────────────────────────────────────────────────────┘
```

### Step 7: Check DATABASE_URL (Auto-Set!)
```
In Environment tab, you should see:
┌──────────────────────────────────────────────────────────┐
│ Environment Variables                                     │
├──────────────────────────────────────────────────────────┤
│ DATABASE_URL    postgresql://postgres:xxxxx@...          │
│                 (This was auto-added by Render!) ✅       │
└──────────────────────────────────────────────────────────┘
```

### Step 8: Add SECRET_KEY
```
Click [+ Add Environment Variable]

Field:  SECRET_KEY
Value:  <paste your random 32-char string here>

To generate one, run in terminal:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 9: Add RESEND_API_KEY
```
Click [+ Add Environment Variable]

Field:  RESEND_API_KEY
Value:  <your resend.com API key>

Note: Get this from https://resend.com/api-keys
```

### Step 10: Add RESEND_FROM_EMAIL
```
Click [+ Add Environment Variable]

Field:  RESEND_FROM_EMAIL
Value:  noreply@uxplores.com
```

### Step 11: Add SITE_URL
```
Click [+ Add Environment Variable]

Field:  SITE_URL
Value:  https://uxplore-flask.onrender.com

Note: Replace "uxplore-flask" with YOUR actual service name
```

### Step 12: Add ADMIN_PASSWORD
```
Click [+ Add Environment Variable]

Field:  ADMIN_PASSWORD
Value:  <your secure password>

Example: MySecurePassword123!
```

### Step 13: Save All Variables
```
You should now see:
┌──────────────────────────────────────────────────────────┐
│ Environment Variables                                     │
├──────────────────────────────────────────────────────────┤
│ DATABASE_URL           postgresql://postgres:xxxxx@...   │
│ SECRET_KEY             xxxxxxxxxxxxx                      │
│ RESEND_API_KEY         re_xxxxxxxxxxxxxx                  │
│ RESEND_FROM_EMAIL      noreply@uxplores.com              │
│ SITE_URL               https://uxplore-flask.onrender.com│
│ ADMIN_PASSWORD         MySecurePassword123!              │
│                                                           │
│ [Save button appears at bottom - click it]              │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 REDEPLOY YOUR APP

### Step 14: Redeploy
```
Go to [Deployments] tab

Look for your failed deployment (red X)
┌────────────────────────────────────────┐
│ Jul 28, 2026 9:26 AM  ❌ Failed        │
│ beee23b - Merge remote changes         │
│                                        │
│                    [Retry]  [Rollback] │
└────────────────────────────────────────┘

Click [Retry] button
```

### Step 15: Wait for Deployment
```
You'll see:
⏳ Building...
⏳ Deploying...
✅ Live

Takes about 2-5 minutes
```

### Step 16: Test Your App
```
When deployment shows ✅ Live:

1. Visit: https://uxplore-flask.onrender.com
2. Should see your UXPLORES homepage ✅

3. Visit: https://uxplore-flask.onrender.com/admin/login
4. Login with:
   Password: MySecurePassword123!
```

---

## ✅ You Should Now See

```
Homepage loads ✅
Admin login works ✅
No database errors ✅
Newsletter signup form appears ✅
```

---

## 🆘 If It Still Fails

**Check these:**
1. ✅ PostgreSQL database exists (green check in dashboard)
2. ✅ `DATABASE_URL` appears in Environment tab
3. ✅ All 5 env vars are set (SECRET_KEY, RESEND_API_KEY, etc.)
4. ✅ Retry deployment after setting variables
5. ✅ Check deployment logs for errors

**View Logs:**
- Go to Deployments tab
- Click the deployment
- Scroll down to see Build Logs
- Look for errors with red [ERROR] tags

---

## 📞 Still Having Issues?

**Common Problems:**

- **"DATABASE_URL not found"** → Postgres database wasn't created. Redo Step 2-5.
- **"Connection refused"** → Wait 60 seconds after creating database before retry.
- **"Secret Key not set"** → Check Environment tab, make sure SECRET_KEY is there.
- **"Email not working"** → Verify RESEND_API_KEY is correct from resend.com

---

**Follow these steps exactly and you'll be live! 🚀**
