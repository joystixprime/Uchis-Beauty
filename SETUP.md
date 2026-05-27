# Uchis Beauty Salon — Deployment & Setup Guide

## Architecture (what you now have)

```
Vercel (frontend)  ←→  Supabase (database + auth + storage)
```

- **Frontend**: React/Vite app, hosted on Vercel  
- **Backend**: Supabase handles everything — auth, database, real-time, storage  
- **No separate Express server needed** for production

---

## Step 1 — Run the Auth SQL in Supabase

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Open `supabase_auth_setup.sql` from this repo and **run the entire file**
3. This creates the `profiles` table, sets up Row Level Security, and seeds your initial app data

---

## Step 2 — Create Staff Login Accounts

For each person who needs portal access (owner, manager, accountant):

### A — Create the Supabase Auth user
1. In your Supabase dashboard → **Authentication → Users**
2. Click **Invite user** (sends them a magic link to set their password)  
   — OR — click **Add user → Create new user** and set a temporary password

### B — Link them to a role
In the SQL Editor, run (fill in the UUID from the Users list):

```sql
INSERT INTO profiles (id, role, name) VALUES (
  'paste-user-uuid-here',
  'owner',   -- or 'manager' or 'accountant'
  'Uchenna'
);
```

**Roles:**
| Role | Access |
|---|---|
| `owner` | Everything — prices, staff, finance, settings, announcements |
| `manager` | Operations — orders, bookings, products, prices, staff, messages |
| `accountant` | Read-only finance + CSV export |

---

## Step 3 — Set Environment Variables on Vercel

1. Go to [vercel.com](https://vercel.com) → your project → **Settings → Environment Variables**
2. Add these two variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://kqfkvcmaogxswbobuqtm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your anon key from Supabase → Settings → API)* |

3. Click **Save**, then **Redeploy** the project

---

## Step 4 — Push to GitHub → Auto-deploy to Vercel

```bash
git add .
git commit -m "Real Supabase auth + clean data layer"
git push origin main
```

Vercel picks up the push and deploys automatically.

---

## Step 5 — Verify it works

1. Visit your Vercel URL
2. Browse as a customer — services, shop, bookings all load from Supabase
3. Go to Profile → Staff sign in
4. Log in with the email/password you created
5. You should land in the correct portal (Owner / Manager / Accountant)

---

## Local Development

```bash
npm install
npm run dev
```

The app calls Supabase directly — no Express server needed locally either.  
Your `.env` file (already present, not committed to git) provides the keys.

---

## Security Notes

- The Supabase **anon key** is safe to expose in the frontend — it's designed for that. Row Level Security controls what it can access.
- Staff login uses **real Supabase Auth** (email + password). No more hardcoded PINs.
- Management data (services, products, etc.) can only be written by authenticated staff.
- Customer data (bookings, orders, messages) can be written by anyone — intentional, so customers can book without an account.

---

## Optional: Enable Supabase Realtime for live chat

In Supabase dashboard → **Database → Replication**, enable replication for the `app_data` table. Then the chat and booking updates will push to all connected clients instantly without refreshing.
