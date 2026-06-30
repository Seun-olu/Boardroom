# Boardroom

A real-time shared kanban board built to demonstrate live collaboration UX — optimistic updates, connection states, presence, and conflict handling.

**Stack:** Next.js 14 · Supabase Realtime · @dnd-kit · TypeScript · Tailwind CSS

## Quick start

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Open **SQL Editor** → paste and run `supabase/schema.sql`
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
src/app/api/board/          ← REST API (load + mutate)
src/hooks/useBoard.ts       ← Client hook (optimistic + realtime)
supabase/schema.sql         ← One-time DB setup
```

## Author

Oluwaseun Olugbewesa — [Portfolio](https://seun-olugbewesa.netlify.app/)
