-- Run this script in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  channel text not null,
  title text not null,
  description text,
  emoji text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_channel_idx on public.events (channel);
create index if not exists events_tags_gin_idx on public.events using gin (tags);

alter table public.projects enable row level security;
alter table public.events enable row level security;

-- Dashboard can read events with anon key.
drop policy if exists "public can read events" on public.events;
create policy "public can read events"
  on public.events
  for select
  using (true);

-- Prevent anon writes; API uses service role key and bypasses RLS.
drop policy if exists "no anon project inserts" on public.projects;
create policy "no anon project inserts"
  on public.projects
  for insert
  to anon
  with check (false);

drop policy if exists "no anon event inserts" on public.events;
create policy "no anon event inserts"
  on public.events
  for insert
  to anon
  with check (false);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end;
$$;
