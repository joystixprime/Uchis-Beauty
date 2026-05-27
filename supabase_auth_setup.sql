-- ============================================================
-- UCHIS BEAUTY SALON — AUTH + SECURITY SETUP
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE (links Supabase Auth users to staff roles)
CREATE TABLE IF NOT EXISTS profiles (
  id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW-LEVEL SECURITY ON PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Staff can only read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- ============================================================
-- 3. ROW-LEVEL SECURITY ON APP_DATA
-- (This is where all app state — services, bookings, etc. — lives)
-- ============================================================
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous customers) can READ all app_data
CREATE POLICY "app_data_read_all"
  ON app_data FOR SELECT
  USING (true);

-- Anonymous users can INSERT customer-facing keys only
CREATE POLICY "app_data_insert_public"
  ON app_data FOR INSERT
  WITH CHECK (key IN ('bookings', 'orders', 'messages'));

-- Anonymous users can UPDATE customer-facing keys only
CREATE POLICY "app_data_update_public"
  ON app_data FOR UPDATE
  USING (key IN ('bookings', 'orders', 'messages'));

-- Authenticated staff can INSERT or UPDATE any key (services, products, etc.)
CREATE POLICY "app_data_write_staff"
  ON app_data FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. SEED INITIAL APP DATA (runs only if app_data is empty)
-- This gives the app its default services, products, staff, etc.
-- Skip this block if you already have data in app_data.
-- ============================================================

INSERT INTO app_data (key, value) VALUES
  ('services', '[
    {"id":"s1","category":"Hair","name":"Box Braids","duration":240,"price":25000,"desc":"Classic box braids, any length","popular":true},
    {"id":"s2","category":"Hair","name":"Knotless Braids","duration":300,"price":35000,"desc":"Lightweight, no tension knotless style","popular":true},
    {"id":"s3","category":"Hair","name":"Cornrows","duration":120,"price":10000,"desc":"Straight-back or freestyle patterns"},
    {"id":"s4","category":"Hair","name":"Hair Wash & Style","duration":75,"price":8000,"desc":"Deep cleanse & professional styling"},
    {"id":"s5","category":"Nails","name":"Classic Manicure","duration":45,"price":5000,"desc":"Shape, cuticle care & polish"},
    {"id":"s6","category":"Nails","name":"Gel Manicure","duration":60,"price":8000,"desc":"Long-lasting gel finish"},
    {"id":"s7","category":"Nails","name":"Acrylic Full Set","duration":90,"price":12000,"desc":"Full set with shape of choice","popular":true},
    {"id":"s8","category":"Feet","name":"Classic Pedicure","duration":60,"price":7000,"desc":"Foot soak, scrub & polish"},
    {"id":"s9","category":"Feet","name":"Luxury Spa Pedicure","duration":90,"price":11000,"desc":"Hot stones, mask & massage","popular":true},
    {"id":"s10","category":"Packages","name":"Full Glow Package","duration":360,"price":45000,"desc":"Hair + mani + pedi combo"}
  ]'::jsonb),
  ('products', '[
    {"id":"p1","name":"Pre-Stretched Braiding Hair 26\"","price":3500,"cost":1600,"stock":120,"category":"Hair Extensions","emoji":"💇🏾‍♀️"},
    {"id":"p2","name":"Human Hair Bundle 20\"","price":25000,"cost":14000,"stock":25,"category":"Hair Extensions","emoji":"✨"},
    {"id":"p3","name":"Edge Control Gel","price":2500,"cost":1100,"stock":7,"category":"Styling","emoji":"💆🏾‍♀️"},
    {"id":"p4","name":"Shine n Jam","price":2000,"cost":900,"stock":60,"category":"Styling","emoji":"💫"},
    {"id":"p5","name":"Gel Polish Set (12 colours)","price":6000,"cost":3200,"stock":30,"category":"Nails","emoji":"💅"},
    {"id":"p6","name":"Cuticle Oil Treatment","price":1500,"cost":600,"stock":4,"category":"Nails","emoji":"🫧"}
  ]'::jsonb),
  ('staff', '[
    {"id":"st1","name":"Uchenna","role":"Owner & Lead Stylist","specialty":"Hair","rating":4.9,"initial":"U"},
    {"id":"st2","name":"Chiamaka","role":"Senior Nail Tech","specialty":"Nails","rating":4.8,"initial":"C"},
    {"id":"st3","name":"Blessing","role":"Braider","specialty":"Hair","rating":5.0,"initial":"B"},
    {"id":"st4","name":"Any professional","role":"First available","specialty":"Any","rating":4.9,"initial":"✨"}
  ]'::jsonb),
  ('announcements', '[
    {"id":"a1","title":"New summer braids in stock! 🌴","body":"Fresh colours just arrived — book early for the weekend.","audience":"customer","active":true,"createdAt":"2024-01-01T00:00:00.000Z"}
  ]'::jsonb),
  ('messages', '[
    {"id":"m1","from":"support","text":"Hi! 👋 Welcome to Uchis Beauty Salon. How can we help you today?","at":"2024-01-01T00:00:00.000Z","read":false}
  ]'::jsonb),
  ('bookings',   '[]'::jsonb),
  ('orders',     '[]'::jsonb),
  ('priceLog',   '[]'::jsonb),
  ('settings',   '{"depositPercent":50,"cancellationFeePercent":20,"peakEnabled":true,"peakDays":["FR","SA","SU"],"peakPricingMultiplier":1.25}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. HOW TO CREATE A STAFF LOGIN ACCOUNT
--
-- For each staff member who needs portal access:
--
-- Step A — Create the Auth user in Supabase Dashboard:
--   Authentication → Users → Invite user (enter their email)
--   They receive an email to set their password.
--   OR use "Add user" and set a temporary password you share with them.
--
-- Step B — Add their profile (replace values as needed):
--
--   INSERT INTO profiles (id, role, name) VALUES (
--     '<paste-the-user-uuid-from-Auth-Users-list>',
--     'owner',   -- or 'manager' or 'accountant'
--     'Uchenna'
--   );
--
-- Roles:
--   owner      → full dashboard (prices, staff, finance, settings, announcements)
--   manager    → operations (orders, bookings, products, prices, staff, messages)
--   accountant → read-only finance + CSV export
-- ============================================================
