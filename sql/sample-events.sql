-- Sample seed data for Event Dashboard
-- 1) Replace the UUID below with your real project id from POST /api/projects response.
-- 2) Run in Supabase SQL Editor.

-- Example:
-- \set project_id '11111111-2222-3333-4444-555555555555'

with params as (
  select
    'REPLACE_WITH_PROJECT_UUID'::uuid as project_id,
    array['orders','signups','deploys','billing','errors']::text[] as channels,
    array[
      'Order paid',
      'New user signup',
      'Deploy completed',
      'Invoice generated',
      'Background job failed',
      'Webhook received',
      'Password reset requested',
      'Subscription renewed',
      'API latency spike detected',
      'Cache warmed successfully'
    ]::text[] as titles,
    array[
      'stripe','webhook','prod','staging','critical','retry','email','mobile','vip','cron'
    ]::text[] as tags_pool,
    array['?','??','??','??','??','??','??','??','??','??']::text[] as emojis
), series as (
  select gs as i
  from generate_series(1, 160) as gs
)
insert into public.events (
  project_id,
  channel,
  title,
  description,
  emoji,
  tags,
  created_at
)
select
  p.project_id,
  p.channels[1 + floor(random() * array_length(p.channels, 1))::int],
  p.titles[1 + floor(random() * array_length(p.titles, 1))::int],
  'Sample event #' || s.i || ' generated for dashboard testing.',
  p.emojis[1 + floor(random() * array_length(p.emojis, 1))::int],
  array[
    p.tags_pool[1 + floor(random() * array_length(p.tags_pool, 1))::int],
    p.tags_pool[1 + floor(random() * array_length(p.tags_pool, 1))::int]
  ]::text[],
  now() - (interval '47 hours') + (s.i * interval '18 minutes')
from params p
cross join series s;
