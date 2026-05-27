-- ============================================
-- UCHIS BEAUTY SALON — COMPLETE SCHEMA
-- ============================================

-- 1. CUSTOMERS
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  email text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. STAFF
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  specialty text,
  rating numeric(2,1) default 5.0,
  pin text not null unique,
  created_at timestamptz default now()
);

-- 3. SERVICES
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  duration integer not null,
  price integer not null,
  description text,
  popular boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. BOOKINGS
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  booking_date date not null,
  booking_time time not null,
  duration integer not null,
  status text default 'new',
  notes text,
  deposit_amount integer default 0,
  deposit_paid boolean default false,
  cancellation_fee integer default 0,
  cancellation_fee_percent integer default 0,
  peak boolean default false,
  refunded_amount integer,
  cancellation_fee_charged integer default 0,
  cancelled_by text,
  cancelled_at timestamptz,
  total integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. BOOKING_SERVICES (many-to-many: bookings have multiple services)
create table if not exists booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  service_id uuid references services(id) on delete restrict,
  created_at timestamptz default now()
);

-- 6. PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price integer not null,
  cost integer not null,
  stock integer default 0,
  emoji text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. ORDERS (product sales)
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  stage text default 'new',
  subtotal integer not null default 0,
  delivery_fee integer default 0,
  fulfill text default 'pickup',
  total_price integer not null,
  paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. ORDER_ITEMS (link products to orders)
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  quantity integer default 1,
  unit_price integer not null,
  created_at timestamptz default now()
);

-- 9. ORDER_HISTORY (tracks stage transitions)
create table if not exists order_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  stage text not null,
  changed_at timestamptz default now()
);

-- 10. PRICE_HISTORY (track service and product price changes)
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('service','product')),
  item_id uuid not null,
  old_price integer,
  new_price integer not null,
  changed_by uuid references staff(id) on delete set null,
  created_at timestamptz default now()
);

-- 11. ANNOUNCEMENTS
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text default 'customer',
  active boolean default true,
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 12. SUPPORT_CONVERSATIONS
create table if not exists support_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  assigned_to uuid references staff(id) on delete set null,
  status text default 'open',
  subject text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 13. MESSAGES (support chat)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references support_conversations(id) on delete cascade,
  from_type text not null check (from_type in ('support','customer','staff')),
  customer_id uuid references customers(id) on delete cascade,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- 14. COMPLAINTS
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  subject text,
  message text not null,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 15. SETTINGS (business rules & policies)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 16. APP_DATA (JSON-backed app state)
create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_bookings_customer on bookings(customer_id);
create index if not exists idx_bookings_staff on bookings(staff_id);
create index if not exists idx_bookings_date on bookings(booking_date);
create index if not exists idx_booking_services_booking on booking_services(booking_id);
create index if not exists idx_booking_services_service on booking_services(service_id);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_stage on orders(stage);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_history_order on order_history(order_id);
create index if not exists idx_price_history_item on price_history(item_id);
create index if not exists idx_messages_customer on messages(customer_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_support_conversations_customer on support_conversations(customer_id);
create index if not exists idx_support_conversations_assigned on support_conversations(assigned_to);

-- ============================================
-- SEED DATA
-- ============================================

-- Staff with PINs
insert into staff (name, role, specialty, pin, rating)
values
  ('Uchenna', 'Owner', 'Hair', '0000', 4.9),
  ('Chiamaka', 'Manager', 'Nails', '1234', 4.8),
  ('Blessing', 'Braider', 'Hair', '9999', 5.0),
  ('✨ Any', 'Any', 'Any', 'any', 4.9)
on conflict (pin) do nothing;

-- Services
insert into services (name, category, duration, price, description, popular)
values
  ('Box Braids', 'Hair', 240, 25000, 'Classic box braids, any length', true),
  ('Knotless Braids', 'Hair', 300, 35000, 'Lightweight, no tension knotless style', true),
  ('Cornrows', 'Hair', 120, 10000, 'Straight-back or freestyle patterns', false),
  ('Hair Wash & Style', 'Hair', 75, 8000, 'Deep cleanse & professional styling', false),
  ('Classic Manicure', 'Nails', 45, 5000, 'Shape, cuticle care & polish', false),
  ('Gel Manicure', 'Nails', 60, 8000, 'Long-lasting gel finish', false),
  ('Acrylic Full Set', 'Nails', 90, 12000, 'Full set with shape of choice', true),
  ('Classic Pedicure', 'Feet', 60, 7000, 'Foot soak, scrub & polish', false),
  ('Luxury Spa Pedicure', 'Feet', 90, 11000, 'Hot stones, mask & massage', true),
  ('Full Glow Package', 'Packages', 360, 45000, 'Hair + mani + pedi combo', false)
on conflict do nothing;

-- Products
insert into products (name, category, price, cost, stock, emoji)
values
  ('Pre-Stretched Braiding Hair 26"', 'Hair Extensions', 3500, 1600, 120, '💇🏾‍♀️'),
  ('Human Hair Bundle 20"', 'Hair Extensions', 25000, 14000, 25, '✨'),
  ('Edge Control Gel', 'Styling', 2500, 1100, 7, '💆🏾‍♀️'),
  ('Shine n Jam', 'Styling', 2000, 900, 60, '💫'),
  ('Gel Polish Set (12 colours)', 'Nails', 6000, 3200, 30, '💅'),
  ('Cuticle Oil Treatment', 'Nails', 1500, 600, 4, '🫧')
on conflict do nothing;

-- Settings
insert into settings (key, value)
values
  ('depositPercent', '50'),
  ('cancellationFeePercent', '20'),
  ('peakEnabled', 'true'),
  ('peakDays', 'FR,SA,SU'),
  ('peakPricingMultiplier', '1.25')
on conflict (key) do nothing;

-- Sample announcement
insert into announcements (title, body, audience, active, created_by)
values
  ('New summer braids in stock! 🌴', 'Fresh colours just arrived — book early for the weekend.', 'customer', true, 
    (select id from staff where role = 'Owner' limit 1))
on conflict do nothing;

-- Sample support message
insert into messages (from_type, text, read)
values
  ('support', 'Hi! 👋 Welcome to Uchis Beauty Salon. How can we help you today?', false)
on conflict do nothing;

-- ============================================
-- ROW-LEVEL SECURITY (Optional - Enable as needed)
-- ============================================
-- Uncomment to enable RLS per table:
  alter table bookings enable row level security;
  alter table orders enable row level security;
  alter table customers enable row level security;
