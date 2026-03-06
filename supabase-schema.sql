create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  api_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  channel text not null,
  title text not null,
  description text,
  icon text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_channel_idx on public.events (channel);
create index if not exists events_tags_gin_idx on public.events using gin (tags);

alter publication supabase_realtime add table public.events;
