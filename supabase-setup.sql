-- ============================================================
-- Run this SQL in your Supabase project:
-- Dashboard → SQL Editor → New Query → paste this → Run
-- ============================================================

-- Files table (stores metadata for all uploaded/processed files)
create table if not exists files (
  id           uuid primary key default gen_random_uuid(),
  original_name text not null,
  path         text not null,
  size         bigint not null,
  content_type text not null,
  created_at   timestamptz not null default now()
);

-- Allow all operations (since we use the anon key server-side)
-- In production, you can tighten these with Row Level Security policies.
alter table files enable row level security;

create policy "Allow all for service" on files
  for all
  using (true)
  with check (true);

-- Users table (stores user credentials and metadata)
create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text unique not null,
  password     text not null,
  created_at   timestamptz not null default now()
);

-- Allow all operations for users (since we use the anon key server-side)
alter table users enable row level security;

create policy "Allow all for service on users" on users
  for all
  using (true)
  with check (true);
