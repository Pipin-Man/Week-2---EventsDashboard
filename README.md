# Events Dashboard

A two-part app for ingesting and monitoring events:

1. **Always-on REST API** (deploy to Render/Railway/Fly/etc.)
2. **Local dashboard** (run on your machine)

Events include:
- `channel` (like `orders`, `signups`, `deploys`)
- `title`
- optional `description`
- optional `icon` (emoji)
- optional `tags` array

## Architecture

- **Supabase Postgres** stores projects + events in the cloud.
- API authenticates with **project API keys** via `x-api-key` header.
- Dashboard reads event feed and subscribes to **Supabase Realtime** for instant updates.

## Quick start

### 1) Create Supabase tables

Run `supabase-schema.sql` in Supabase SQL Editor.

### 2) Install dependencies

```bash
npm install
```

### 3) Configure API env

Create `api/.env`:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=4000
DASHBOARD_ORIGIN=http://localhost:5173
```

### 4) Configure dashboard env

Create `dashboard/.env`:

```bash
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 5) Run both apps

Terminal A:
```bash
npm run dev:api
```

Terminal B:
```bash
npm run dev:dashboard
```

Dashboard: `http://localhost:5173`

## API usage

### Create project + API key

`POST /api/projects`

```json
{
  "name": "My Store",
  "description": "Production monitoring"
}
```

Response includes generated `apiKey`.

### Send an event

`POST /api/events` with header `x-api-key: <apiKey>`

```json
{
  "channel": "orders",
  "title": "Order paid",
  "description": "Order #1842 paid by Stripe",
  "icon": "💳",
  "tags": ["prod", "stripe"]
}
```

## Deployment notes (API)

Deploy the `api/` workspace to a cloud host so it remains online 24/7.
Set the same `api/.env` variables in your host dashboard.

Good options:
- Render Web Service
- Railway Service
- Fly.io App

After deployment, update local dashboard `VITE_API_BASE_URL` to your deployed API URL.
