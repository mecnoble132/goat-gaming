  -- Run this in Supabase SQL Editor for a fresh setup.
  -- Single-location store setup for Goat Gaming.

  create extension if not exists pgcrypto;

  create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'staff' check (role in ('owner', 'staff')),
    created_at timestamptz not null default now()
  );

  create table if not exists public.customers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null unique,
    whatsapp_number text not null,
    loyalty_points integer not null default 0,
    created_at timestamptz not null default now()
  );

  create table if not exists public.stations (
    id text primary key,
    name text not null,
    type text not null check (type in ('ps5', 'snooker', 'pool', 'vr'))
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
    customer_id uuid references public.customers(id) on delete set null,
    customer_name text,
    customer_phone text,
    game_type text check (game_type in ('ps5', 'snooker', 'pool', 'vr')),
    controllers integer,
    vr_mode text check (vr_mode in ('cricket', 'adventure')),
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

  alter table public.products enable row level security;

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
insert into public.customers (name, phone, whatsapp_number, loyalty_points, created_at) values
('Rahul Sharma', '9876543210', '9876543210', 450, now() - interval '30 days'),
('Sneha Kapoor', '9888877777', '9888877777', 120, now() - interval '25 days'),
('Vikram Singh', '9811112222', '9811112222', 890, now() - interval '20 days'),
('Ananya Iyer', '9822223333', '9822223333', 0, now() - interval '18 days'),
('Arjun Mehra', '9833334444', '9833334444', 2100, now() - interval '15 days'),
('Pooja Verma', '9844445555', '9844445555', 75, now() - interval '12 days'),
('Rohan Das', '9855556666', '9855556666', 320, now() - interval '10 days'),
('Kritika Malhotra', '9866667777', '9866667777', 150, now() - interval '8 days'),
('Siddharth Jain', '9877778888', '9877778888', 500, now() - interval '5 days'),
('Ishita Gupta', '9888889999', '9888889999', 45, now() - interval '3 days'),
('Manish Pandey', '9899990000', '9899990000', 1200, now() - interval '2 days'),
('Tanvi Reddy', '9800001111', '9800001111', 0, now() - interval '1 day'),
('Zeeshan Khan', '9811223344', '9811223344', 350, now() - interval '12 hours'),
('Simran Kaur', '9822334455', '9822334455', 85, now() - interval '6 hours'),
('Abhishek Ray', '9833445566', '9833445566', 15, now());
