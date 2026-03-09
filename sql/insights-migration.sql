-- Apply this migration in Supabase SQL Editor if your project was already created.

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, title)
);

create index if not exists insights_project_title_idx on public.insights (project_id, title);

alter table public.insights enable row level security;
