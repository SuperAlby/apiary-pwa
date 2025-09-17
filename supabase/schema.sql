-- Enable pgcrypto for gen_random_uuid if not enabled
create extension if not exists pgcrypto;

-- APIARIES
create table if not exists public.apiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lat double precision,
  lon double precision,
  note text,
  created_at timestamptz not null default now()
);

-- HIVES
create table if not exists public.hives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  code text not null,
  queen_birth_date date,
  note text,
  created_at timestamptz not null default now()
);

-- INSPECTIONS
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hive_id uuid not null references public.hives(id) on delete cascade,
  visited_at timestamptz not null default now(),
  queen_seen boolean,
  eggs boolean,
  frames_bees int,
  stores_kg numeric(6,2),
  note text,
  created_at timestamptz not null default now()
);
