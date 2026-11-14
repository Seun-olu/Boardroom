# Boardroom

A real-time shared kanban board built to demonstrate live collaboration UX — optimistic updates, connection states, presence, and conflict handling.

**Stack:** Next.js 14 · Supabase Realtime · @dnd-kit · TypeScript · Tailwind CSS

## Quick start

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Apply the migrations in `supabase/migrations/` in filename order (SQL Editor, or `supabase db push` with the Supabase CLI)
3. Go to **Project Settings → API** and copy your URL + keys

### 2. Configure env

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002), create a board, and open the link in another tab to test sync.

## Database

`supabase/migrations/` is the source of truth. The schema is relational (workspaces → boards → lanes → cards, plus comments, activity and notifications), and access is decided in Postgres:

- **Roles per workspace:** owner › admin › member › viewer, enforced by row-level security on every table. Anonymous callers have no table access.
- **Optimistic concurrency in the database:** every board, lane and card has a `version`. A trigger rejects any update that doesn't move it from *n* to *n + 1* (HTTP 409 through PostgREST), so concurrent edits can't silently overwrite each other on any write path.
- **One write RPC:** `apply_board_action(board, clientActionId, action)` runs each action in one transaction. It returns `ok`, `conflict` (with the current row) or `rejected`, and is idempotent per user + `clientActionId`, so offline retries never duplicate cards.
- **Audit:** `created_by` / `updated_by` are stamped from the signed-in user, and an activity log is written by trigger.

Database tests run the real migrations in [PGlite](https://pglite.dev) (in-process Postgres) as Supabase's `authenticated` / `anon` roles: `supabase/tests/schema.test.ts`.

## Checks

```bash
npm run lint
npm run typecheck
npm test          # Vitest: engine, validation, API route
npm run build
```

CI runs the same four steps on every push and pull request (`.github/workflows/ci.yml`).

## Deploy (Netlify)

1. Push to GitHub
2. Import repo on [Netlify](https://netlify.com)
3. Add the same three env vars in **Site settings → Environment variables**
4. Deploy — no separate realtime server needed

## Features

| Feature | Implementation |
|---------|----------------|
| Real-time sync | Supabase Realtime broadcast + Next.js API |
| Persistence | Supabase Postgres |
| Drag & drop | @dnd-kit |
| Optimistic UI | Local updates, rollback on conflict |
| Connection states | Live / Reconnecting / Offline |
| Offline queue | localStorage, flushed on reconnect |
| Presence | Supabase Realtime presence |

## Project structure

```
src/lib/board-engine.ts     ← Board logic (moves, conflicts, templates)
src/lib/validation.ts       ← Zod schemas + size limits for every API action
src/app/api/board/          ← REST API (load + mutate; validates before DB access)
src/hooks/useBoard.ts       ← Client hook (optimistic + realtime)
supabase/schema.sql         ← One-time DB setup
```

## Author

Oluwaseun Olugbewesa — [Portfolio](https://seun-olugbewesa.netlify.app/)
