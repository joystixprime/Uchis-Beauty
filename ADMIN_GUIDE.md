# Uchis Beauty Salon — Admin Backend Guide

## How to access the admin portal
1. Open the app (uchisbeauty.com)
2. Tap **Profile** (bottom nav) → **Staff sign in**
3. Enter your staff email + password

---

## Adding / editing products

1. Sign in as **Owner** or **Manager**
2. In the sidebar tap **Products**
3. Tap **Upload** (top-right) to add a new product:
   - Upload a photo (optional, max 2 MB)
   - Fill in name, category, emoji (fallback icon), sell price, cost price, and stock
   - Tap **Save product**
4. To edit an existing product, tap the pencil **Edit** icon on any product card
5. To restock, tap the **+ Restock** button and enter the quantity to add

---

## Changing prices

1. Go to **Prices** in the sidebar
2. Switch between **Products** and **Services** tabs
3. Edit prices directly in the input fields (changed items highlight in teal)
4. Use the bulk buttons (**+5%, +10%, –5%, –10%**) to shift all prices at once
5. Tap **Apply price changes** — every change is logged under "Recent changes"

---

## Adding / editing services

1. Go to **Services** in the sidebar
2. Tap **Add** (top-right) → fill in category, name, description, price, duration
3. Check **Mark as popular** to feature it on the home screen
4. Tap **Save**

---

## Posting announcements

1. Go to **Announcements** in the sidebar
2. Tap **New** → write a title and optional message body
3. Choose **who sees it**: Customers / Staff / Everyone
4. Toggle **Make this live immediately** and tap **Save announcement**
5. To pause an announcement: tap **Turn off** — it stays saved for later

---

## Approving & managing bookings

1. Go to **Bookings** in the sidebar
2. New booking requests appear under **Awaiting approval** with an amber border
3. Tap **Approve** to confirm → the customer's booking status changes to *Confirmed*
4. Tap **Decline** to reject
5. After the appointment, tap **Mark done** to mark it completed

---

## Processing orders

1. Go to **Orders** in the sidebar
2. Each order shows its pipeline stage: New → Confirmed → Processing → Ready → Completed
3. Tap an order to expand it, then tap **Move to [next stage]** as you work through it
4. Toggle **Mark as paid** once payment is received
5. To cancel an order (restores stock automatically): tap **Cancel**

---

## Managing staff

1. Go to **Staff** in the sidebar
2. Tap **Add** to create a new team member profile (name, role, specialty, rating)
3. Edit or delete with the pencil / trash icons
4. Staff profiles shown here are **customer-facing only** (the team display on the home screen)
5. To give someone **portal access**, create a Supabase Auth user and add them to the `profiles` table — see SETUP.md Step 2

---

## Responding to customer messages

1. Go to **Messages** in the sidebar
2. Type your reply in the text box at the bottom and press Enter or tap Send
3. Your message appears in the customer's in-app chat instantly (realtime)

---

## Finance & reports (Accountant portal)

1. Sign in as **Accountant**
2. Use the **Today / Week / Month / All time** filter to scope the figures
3. Tap **Export CSV** to download a spreadsheet of all orders and bookings
4. The **Reconcile** tab lists all unpaid orders for follow-up

---

## Settings (Owner only)

Go to **Settings** in the sidebar to configure:
- **Peak period** — which days of the week require a deposit
- **Minimum deposit %** — what % customers pay upfront on peak days
- **Cancellation fee %** — what % of the deposit is non-refundable if cancelled

---

## Configuring Paystack payments

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com) → Settings → API Keys
2. Copy your **Public Key** (starts with `pk_live_` for live, `pk_test_` for testing)
3. In Vercel: Settings → Environment Variables → add `VITE_PAYSTACK_PUBLIC_KEY` = your key
4. Redeploy — payments will now be enabled on the checkout screens

---

## Configuring Supabase email confirmation redirect

After a customer confirms their email, Supabase redirects them to your site:
1. Supabase dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to `https://uchisbeauty.com`
3. Add `https://uchisbeauty.com` to **Redirect URLs**
4. Save

---

## Running the customer account SQL

After deploying new code, run the customer profiles SQL in Supabase SQL Editor:
1. Open `supabase_customer_setup.sql` from this repo
2. Paste and run it in the SQL Editor
3. This creates the `customer_profiles` table with Row Level Security

To also enable **realtime chat**, uncomment and run:
```sql
alter publication supabase_realtime add table public.app_data;
```
(only needed once)
