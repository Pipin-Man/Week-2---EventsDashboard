begin;

-- Recreate deterministic sample projects and events for local development/demo.
-- Safe to run multiple times.

delete from public.events
where project_id in (
  select id
  from public.projects
  where api_key in ('ed_sample_store_api_key', 'ed_sample_saas_api_key')
);

delete from public.projects
where api_key in ('ed_sample_store_api_key', 'ed_sample_saas_api_key');

insert into public.projects (name, description, api_key)
values
  ('Acme Store', 'E-commerce production event stream', 'ed_sample_store_api_key'),
  ('Beacon SaaS', 'Signup and deployment telemetry', 'ed_sample_saas_api_key');

with project_lookup as (
  select id, api_key
  from public.projects
  where api_key in ('ed_sample_store_api_key', 'ed_sample_saas_api_key')
)
insert into public.events (project_id, channel, title, description, icon, tags, created_at)
values
  ((select id from project_lookup where api_key = 'ed_sample_store_api_key'), 'orders', 'Order paid', 'Order #1842 paid by Stripe', '💳', array['prod','stripe'], now() - interval '2 hours'),
  ((select id from project_lookup where api_key = 'ed_sample_store_api_key'), 'orders', 'Refund requested', 'Customer requested refund for Order #1838', '↩️', array['prod','support'], now() - interval '95 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_store_api_key'), 'inventory', 'Low stock warning', 'SKU-RED-HOODIE dropped below threshold', '📦', array['prod','inventory'], now() - interval '70 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_saas_api_key'), 'signups', 'New trial signup', 'alice@example.com started a free trial', '🎉', array['prod','growth'], now() - interval '55 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_saas_api_key'), 'deploys', 'Deployment succeeded', 'v1.23.0 rolled out to production', '🚀', array['prod','release'], now() - interval '40 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_saas_api_key'), 'alerts', 'Elevated API latency', 'P95 latency exceeded 600ms for 10 minutes', '⚠️', array['prod','incident'], now() - interval '25 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_store_api_key'), 'orders', 'Order paid', 'Order #1843 paid by PayPal', '💰', array['prod','paypal'], now() - interval '10 minutes'),
  ((select id from project_lookup where api_key = 'ed_sample_saas_api_key'), 'signups', 'Team invite accepted', 'bob@example.com joined workspace "Acme Ops"', '✅', array['prod','activation'], now() - interval '4 minutes');

commit;
