-- ============================================================
--  Uchis Beauty Salon — Customer Auth Setup
--  Run this in Supabase SQL Editor AFTER supabase_auth_setup.sql
-- ============================================================

-- 1. Customer profiles table
create table if not exists public.customer_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  phone       text,
  email       text,
  created_at  timestamptz default now()
);

-- 2. Row Level Security
alter table public.customer_profiles enable row level security;

-- Customers can read and update their own profile
create policy "customer: read own profile"
  on public.customer_profiles for select
  using (auth.uid() = id);

create policy "customer: insert own profile"
  on public.customer_profiles for insert
  with check (auth.uid() = id);

create policy "customer: update own profile"
  on public.customer_profiles for update
  using (auth.uid() = id);

-- Staff (authenticated users with a profiles row) can read all customer profiles
create policy "staff: read all customer profiles"
  on public.customer_profiles for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
    )
  );

-- ============================================================
--  Also enable Supabase Realtime on app_data so live chat works
--  (Run this separately if needed)
-- ============================================================
-- alter publication supabase_realtime add table public.app_data;
