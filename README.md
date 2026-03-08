# Event Dashboard

Production-ready event monitoring app with:
- **Remote API** (`api/`) for ingestion via API key auth
- **Local dashboard** (`dashboard/`) with live feed, channel filter, search, and activity chart
- **Supabase** as always-on cloud database + realtime backend

## Quick Start (5 minutes)

If you are brand new, follow only these steps first:

1. In Supabase, run [`sql/supabase.sql`](./sql/supabase.sql) in **SQL Editor**.
2. In Supabase **Project Settings -> API**, copy:
- Project URL
- anon/public key
- service_role key
3. Install deps from repo root:

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard"
npm.cmd install
```

4. Configure API env:

```powershell
cd api
Copy-Item .env.example .env -Force
notepad .env
```

Set:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PROJECT_CREATION_TOKEN=your-secret
```

5. Start API (keep terminal open):

```powershell
cd ..
npm.cmd run dev:api
```

6. In a second terminal, create project and print full API key:

```powershell
$response = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/projects" `
  -ContentType "application/json" `
  -Body (@{ name = "My Project"; creationToken = "your-secret" } | ConvertTo-Json)

$response.apiKey
```

7. Send one event with that key:

```powershell
$event = @{ channel = "deploys"; title = "Hello dashboard"; tags = @("test") } | ConvertTo-Json

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/events" `
  -Headers @{ "x-api-key" = "PASTE_FULL_API_KEY_HERE" } `
  -ContentType "application/json" `
  -Body $event
```

8. Configure dashboard env and run it:

```powershell
cd dashboard
Copy-Item .env.example .env -Force
notepad .env
```

Set:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Run:

```powershell
cd ..
npm.cmd run dev:dashboard
```

Open [http://localhost:5173](http://localhost:5173).

## Architecture

1. Your apps send events to `POST /api/events` with `x-api-key`.
2. API stores events in Supabase.
3. Dashboard reads from Supabase and subscribes to realtime inserts.

## Prerequisites

- Node.js 20+
- npm
- Supabase project

## 1) Create Supabase schema

1. Create a Supabase project.
2. Open **SQL Editor** and run [`sql/supabase.sql`](./sql/supabase.sql).
3. Go to **Project Settings -> API** and copy:
- **Project URL** -> `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **service_role key** -> `SUPABASE_SERVICE_ROLE_KEY` (API only)
- **anon/public key** -> `VITE_SUPABASE_ANON_KEY` (dashboard only)

## 2) Install dependencies

From repo root:

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard"
npm.cmd install
```

## 3) Configure API

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard\api"
Copy-Item .env.example .env -Force
notepad .env
```

Set `.env`:

```env
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PROJECT_CREATION_TOKEN=your-random-secret-token
```

Run API:

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard"
npm.cmd run dev:api
```

Expected log:

```text
API listening on port 3000
```

## 4) Create project + API key (PowerShell-safe)

Open a **second** terminal (keep API terminal running):

```powershell
$response = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/projects" `
  -ContentType "application/json" `
  -Body (@{ name = "My Project"; creationToken = "your-random-secret-token" } | ConvertTo-Json)

$response.apiKey
```

Notes:
- PowerShell may show truncated values like `edk_123...` in table view.
- Use `$response.apiKey` or `$response | ConvertTo-Json -Depth 5` to get the full key.

## 5) Send a test event (PowerShell-safe)

```powershell
$event = @{
  channel = "deploys"
  title = "First event"
  description = "test event"
  emoji = "??"
  tags = @("test")
} | ConvertTo-Json

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/events" `
  -Headers @{ "x-api-key" = "YOUR_FULL_API_KEY" } `
  -ContentType "application/json" `
  -Body $event
```

You should receive a response containing the inserted event.

## 6) Configure and run dashboard (local)

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard\dashboard"
Copy-Item .env.example .env -Force
notepad .env
```

Set `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run dashboard:

```powershell
cd "C:\Users\pipin\Desktop\GitHub\Week-2 - EventDashboard"
npm.cmd run dev:dashboard
```

Open `http://localhost:5173`.

## Deploy API to Render (always-on)

A Render Blueprint is included at [`render.yaml`](./render.yaml).

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Render, create a Blueprint from the repo.
3. Set env vars in Render:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PROJECT_CREATION_TOKEN`
4. Deploy.

After deployment, send events to:
- `POST https://<your-render-service>/api/events`

## API contract

### `POST /api/projects`
Creates an ingestion project and returns an API key.

Request:

```json
{
  "name": "My Project",
  "creationToken": "your-random-secret-token"
}
```

Response:

```json
{
  "project": {
    "id": "uuid",
    "name": "My Project",
    "created_at": "2026-03-07T..."
  },
  "apiKey": "edk_..."
}
```

### `POST /api/events`
Requires `x-api-key` header.

Request:

```json
{
  "channel": "orders",
  "title": "Order #1532 paid",
  "description": "Optional",
  "emoji": "?",
  "tags": ["vip", "stripe"]
}
```

### `GET /api/health`
Health check endpoint.

## Troubleshooting

### PowerShell blocks npm (`running scripts is disabled`)
Use one of:

```powershell
npm.cmd run dev:api
```

or

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### `'tsx' is not recognized`
Install dependencies from repo root:

```powershell
npm.cmd install
```

### Dashboard is blank
Most likely env issue. Check:
- `dashboard/.env` exists
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- You restarted Vite after editing `.env`
- Browser console for `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`

### Feed is empty
UI can load with zero events. Send at least one event via `POST /api/events`.

### `POST /api/projects` returns `Invalid creation token`
The token in your request must exactly match `PROJECT_CREATION_TOKEN` in `api/.env`.
