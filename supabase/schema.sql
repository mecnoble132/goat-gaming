  -- Run this in Supabase SQL Editor for a fresh setup.
  -- Single-location store setup for Goat Gaming.

  create extension if not exists pgcrypto;

  create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'staff' check (role in ('owner', 'staff')),
    created_at timestamptz not null default now()
  );

  create table if not exists public.customers (
    id text primary key,
    name text,
    phone text unique not null,
    whatsapp_number text,
    loyalty_points integer default 0,
    visits integer default 0,
    created_at timestamptz not null default now()
  );

  -- Migration for existing databases
  do $$ 
  begin 
    -- Add visits column if missing
    if not exists (select 1 from information_schema.columns where table_name='customers' and column_name='visits') then
      alter table public.customers add column visits integer default 0;
    end if;
    
    -- Fix ID type if it's still uuid
    if (select data_type from information_schema.columns where table_name='customers' and column_name='id') = 'uuid' then
      -- Drop the foreign key first so we can change the types
      alter table public.bookings drop constraint if exists bookings_customer_id_fkey;
      
      -- Change types
      alter table public.customers alter column id type text;
      alter table public.bookings alter column customer_id type text;
      
      -- Re-add the foreign key with CASCADE so we can update IDs later
      alter table public.bookings 
        add constraint bookings_customer_id_fkey 
        foreign key (customer_id) references public.customers(id) 
        on update cascade
        on delete set null;
    end if;
  end $$;

  create table if not exists public.stations (
    id text primary key,
    name text not null,
    type text not null
  );

  create table if not exists public.booking_settings (
    id integer primary key check (id = 1),
    opening_time text not null,
    closing_time text not null,
    slot_minutes integer not null check (slot_minutes > 0)
  );

  create table if not exists public.pricing_settings (
    id integer primary key check (id = 1),
    config jsonb not null
  );

  create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('booking', 'block')),
    station_id text not null references public.stations(id) on delete restrict,
    station_name text not null,
    date date not null,
    start_time text not null,
    duration_minutes integer not null check (duration_minutes > 0),
    customer_id text references public.customers(id) on update cascade on delete set null,
    customer_name text,
    customer_phone text,
    game_type text,
    controllers integer,
    vr_mode text,
    vr_label text,
    notes text,
    reason text,
    created_at timestamptz not null default now(),
    cancelled_at timestamptz
  );

  alter table public.profiles enable row level security;
  alter table public.customers enable row level security;
  alter table public.stations enable row level security;
  alter table public.booking_settings enable row level security;
  alter table public.pricing_settings enable row level security;
  alter table public.bookings enable row level security;

  create table if not exists public.products (
    id text primary key,
    name text not null,
    category text not null,
    mrp integer not null check (mrp >= 0),
    stock_quantity integer not null default 0,
    low_stock_threshold integer not null default 5,
    created_at timestamptz not null default now()
  );

  create table if not exists public.bills (
    id text primary key,
    customer_id text references public.customers(id) on delete set null,
    customer_name text not null,
    customer_phone text,
    payment_method text not null check (payment_method in ('cash', 'upi', 'card')),
    subtotal integer not null,
    discount integer not null default 0,
    grand_total integer not null,
    points_earned integer not null default 0,
    points_redeemed integer not null default 0,
    items jsonb not null,
    created_at timestamptz not null default now()
  );

  alter table public.products enable row level security;
  alter table public.bills enable row level security;

  drop policy if exists "bills all authenticated" on public.bills;
  create policy "bills all authenticated"
  on public.bills
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "products all authenticated" on public.products;
  create policy "products all authenticated"
  on public.products
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "profiles read own" on public.profiles;
  create policy "profiles read own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

  drop policy if exists "customers all authenticated" on public.customers;
  create policy "customers all authenticated"
  on public.customers
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "stations all authenticated" on public.stations;
  create policy "stations all authenticated"
  on public.stations
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "booking_settings all authenticated" on public.booking_settings;
  create policy "booking_settings all authenticated"
  on public.booking_settings
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "pricing_settings all authenticated" on public.pricing_settings;
  create policy "pricing_settings all authenticated"
  on public.pricing_settings
  for all
  to authenticated
  using (true)
  with check (true);

  drop policy if exists "bookings all authenticated" on public.bookings;
  create policy "bookings all authenticated"
  on public.bookings
  for all
  to authenticated
  using (true)
  with check (true);

  -- Ensure every new auth user gets a profile row.
  create or replace function public.handle_new_user_profile()
  returns trigger
  language plpgsql
  security definer
  as $$
  begin
    insert into public.profiles (id, role)
    values (new.id, 'owner')
    on conflict (id) do nothing;
    return new;
  end;
  $$;

  drop trigger if exists on_auth_user_created_profile on auth.users;
  create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

  insert into public.stations (id, name, type) values
  ('ps5-1', 'PS5 Unit 1', 'ps5'),
  ('ps5-2', 'PS5 Unit 2', 'ps5'),
  ('ps5-3', 'PS5 Unit 3', 'ps5'),
  ('snooker-1', 'Snooker Table 1', 'snooker'),
  ('snooker-2', 'Snooker Table 2', 'snooker'),
  ('pool-1', 'Pool Table 1', 'pool'),
  ('vr-1', 'VR Setup 1', 'vr')
  on conflict (id) do nothing;

  insert into public.booking_settings (id, opening_time, closing_time, slot_minutes)
  values (1, '10:00', '23:00', 15)
  on conflict (id) do nothing;

  insert into public.pricing_settings (id, config)
  values (
    1,
    '{
      "ps5": {
        "1-15": 50, "1-30": 90, "1-60": 160, "1-120": 300, "1-180": 430, "1-240": 560,
        "2-15": 60, "2-30": 110, "2-60": 200, "2-120": 380, "2-180": 540, "2-240": 700,
        "3-15": 70, "3-30": 130, "3-60": 230, "3-120": 450, "3-180": 640, "3-240": 830,
        "4-15": 80, "4-30": 150, "4-60": 260, "4-120": 510, "4-180": 720, "4-240": 940
      },
      "snooker": { "15": 70, "30": 130, "60": 240, "90": 350, "120": 450, "150": 540, "180": 620 },
      "pool": { "15": 60, "30": 110, "60": 200, "90": 290, "120": 360, "150": 430, "180": 500 },
      "vr_cricket": [
        { "label": "2 Overs", "price": 60, "minutes": 10 },
        { "label": "5 Overs", "price": 100, "minutes": 20 },
        { "label": "10 Overs", "price": 180, "minutes": 30 },
        { "label": "15 Overs", "price": 250, "minutes": 45 },
        { "label": "20 Overs", "price": 310, "minutes": 60 }
      ],
      "vr_adventure": [
        { "label": "Roller Coaster", "price": 80, "minutes": 15 },
        { "label": "Boxing", "price": 100, "minutes": 15 },
        { "label": "Shooting", "price": 130, "minutes": 15 },
        { "label": "Table Tennis", "price": 100, "minutes": 15 },
        { "label": "Golf", "price": 100, "minutes": 15 }
      ]
    }'::jsonb
  )
  on conflict (id) do nothing;

  create table if not exists public.loyalty_settings (
    id integer primary key check (id = 1),
    earn_rate_points integer not null default 5,
    earn_rate_minutes integer not null default 30,
    redeem_rate_points integer not null default 70,
    redeem_rate_minutes integer not null default 60,
    created_at timestamptz not null default now()
  );

  alter table public.loyalty_settings enable row level security;

  drop policy if exists "loyalty_settings all authenticated" on public.loyalty_settings;
  create policy "loyalty_settings all authenticated"
  on public.loyalty_settings
  for all
  to authenticated
  using (true)
  with check (true);

  insert into public.loyalty_settings (id, earn_rate_points, earn_rate_minutes, redeem_rate_points, redeem_rate_minutes)
  values (1, 5, 30, 70, 60)
  on conflict (id) do nothing;

insert into public.products (id, name, category, mrp, stock_quantity, low_stock_threshold) values
('PRD-001', 'Red Bull', 'Drinks', 60, 15, 5),
('PRD-002', 'Coca Cola', 'Drinks', 40, 24, 6),
('PRD-003', 'Monster Energy', 'Drinks', 110, 10, 4),
('PRD-004', 'Lays Classic', 'Snacks', 30, 20, 5),
('PRD-005', 'Doritos Cheese', 'Snacks', 45, 12, 5),
('PRD-006', 'Kurkure Masala', 'Snacks', 20, 30, 10),
('PRD-007', 'Cold Coffee', 'Drinks', 80, 8, 3),
('PRD-008', 'Water Bottle', 'Drinks', 20, 50, 10)
on conflict (id) do nothing;

-- Placeholder Customers
insert into public.customers (id, name, phone, whatsapp_number, loyalty_points, visits, created_at) values
('CUS-1001', 'Rahul Sharma', '9876543210', '9876543210', 450, 5, now() - interval '30 days'),
('CUS-1002', 'Sneha Kapoor', '9888877777', '9888877777', 120, 2, now() - interval '25 days'),
('CUS-1003', 'Vikram Singh', '9811112222', '9811112222', 890, 12, now() - interval '20 days'),
('CUS-1004', 'Ananya Iyer', '9822223333', '9822223333', 0, 1, now() - interval '18 days'),
('CUS-1005', 'Arjun Mehra', '9833334444', '9833334444', 2100, 45, now() - interval '15 days'),
('CUS-1006', 'Pooja Verma', '9844445555', '9844445555', 75, 3, now() - interval '12 days'),
('CUS-1007', 'Rohan Das', '9855556666', '9855556666', 320, 8, now() - interval '10 days'),
('CUS-1008', 'Kritika Malhotra', '9866667777', '9866667777', 150, 4, now() - interval '8 days'),
('CUS-1009', 'Siddharth Jain', '9877778888', '9877778888', 500, 10, now() - interval '5 days'),
('CUS-1010', 'Ishita Gupta', '9888889999', '9888889999', 45, 2, now() - interval '3 days'),
('CUS-1011', 'Manish Pandey', '9899990000', '9899990000', 1200, 25, now() - interval '2 days'),
('CUS-1012', 'Tanvi Reddy', '9800001111', '9800001111', 0, 1, now() - interval '1 day'),
('CUS-1013', 'Zeeshan Khan', '9811223344', '9811223344', 350, 7, now() - interval '12 hours'),
('CUS-1014', 'Simran Kaur', '9822334455', '9822334455', 85, 3, now() - interval '6 hours'),
('CUS-1015', 'Abhishek Ray', '9833445566', '9833445566', 15, 1, now())
on conflict (phone) do update set id = excluded.id;

-- ─── Atomic stock decrement RPC ────────────────────────────────────────────────
-- Called by BillingPage.handleFinalize instead of the old read-then-write pattern.
-- Using a server-side expression (stock_quantity - p_qty) means both concurrent
-- cashiers cannot both read the same stale value — the UPDATE is serialised by
-- Postgres row-level locking, so stock is always correct.
create or replace function public.decrement_stock(p_product_id text, p_qty integer)
returns void
language sql
security definer
as $$
  update public.products
  set    stock_quantity = greatest(0, stock_quantity - p_qty)
  where  id = p_product_id;
$$;

-- ─── Performance index for the rolling-window bookings query ───────────────────
-- BookingsPage filters by date range and station; this composite index makes
-- that query O(log n) instead of a full table scan.
create index if not exists bookings_date_station_idx
  on public.bookings (date, station_id);

-- ─── Profiles column enhancements ──────────────────────────────────────────────
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;

-- ─── Loyalty Transactions ──────────────────────────────────────────────────────
create table if not exists public.loyalty_transactions (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  bill_id text not null references public.bills(id) on delete cascade,
  points_earned integer not null default 0,
  points_redeemed integer not null default 0,
  type text not null check (type in ('earn', 'redeem')),
  created_at timestamptz not null default now()
);

alter table public.loyalty_transactions enable row level security;

drop policy if exists "loyalty_transactions all authenticated" on public.loyalty_transactions;
create policy "loyalty_transactions all authenticated"
  on public.loyalty_transactions
  for all
  to authenticated
  using (true)
  with check (true);


