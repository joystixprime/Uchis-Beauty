# Uchis Beauty Salon — Owner / Manager / Accountant

Three distinct staff roles, each with its own portal and permissions, plus an announcements/banner system. Teal theme, Naira, mobile-first with desktop sidebar layouts.

## Run it

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## The roles & who can do what

Sign in from **Profile → Staff sign in**, pick a role, enter the PIN.

### Owner (PIN 0000) — full control
- Orders (full pipeline), Bookings, Announcements, Products, Prices, Services, Staff, Finance
- **Settings** — deposit %, cancellation %, peak days (owner-only)

### Manager (PIN 1234) — everything except Settings
The manager runs the business day to day with broad access:
- **Orders** — full processing pipeline (New → Confirmed → Processing → Ready → Completed)
- **Bookings** — approve/decline, mark complete
- **Announcements** — post banners (same tool as owner)
- **Products** — upload with photos, set price + cost, restock
- **Prices** — inline editing, bulk ±% changes, price history
- **Services** — full CRUD
- **Staff** — add/edit/remove team members
- **Finance** — gross profit, revenue split, deposits, outstanding
- The **only** thing reserved for the owner is **Settings & policies** (deposit/cancellation/peak rules).

### Accountant (PIN 5678) — view-only financials
- Summary, order income, booking income, reconciliation, CSV export
- Cannot edit anything

## Announcements / banners

Both **owner and manager** can post announcements. Each one targets, per announcement:
- **Customers** — dismissible teal banner on the customer home screen
- **Staff** — notice atop the manager portal
- **Everyone** — both

Toggle live/off without deleting; the editor shows a live customer preview. One sample is seeded.

## Demo PINs

- Owner: **0000**
- Manager: **1234**
- Accountant: **5678**

Change in `src/UchisApp.jsx` (search `const PINS`).

## Data

Saves to browser localStorage (keys start with `uchiR:`). Clear to reset.

## Production note

PINs are hardcoded for demonstration — this shows the structure of role separation but is not real security. The manager's lack of a Settings tab is enforced in the UI only. For production, each person needs their own account with permissions enforced server-side, not just hidden in the interface.

## Customer self-service (new)

- **Cancel a booking** — from My Bookings, customers can cancel any upcoming pending/confirmed booking themselves. If it's a peak-day booking with a deposit, the confirmation dialog shows exactly how much of the deposit is kept as the cancellation fee and how much is refunded, and the cancelled card records it.
- **Customer-service chat** — a floating chat button (bottom-right) opens a live support thread from anywhere in the customer app. Messages persist and appear in the **Messages** tab of both the Owner and Manager portals, where staff can reply. (In this demo an auto-acknowledgement is sent; in production this connects to a real agent or your messaging provider.)
