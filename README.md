# Boardroom

A real-time shared kanban board (Todo / Doing / Done) built to demonstrate live collaboration UX — optimistic updates, connection states, presence, and conflict handling.

**Stack:** Next.js 14 · PartyKit · @dnd-kit · TypeScript · Tailwind CSS

## Quick start

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

This runs **Next.js** (`localhost:3000`) and **PartyKit** (`localhost:1999`) concurrently.

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Open a board**
3. Copy the room link and open it in another tab/browser to test multi-user sync

## Deploy

### 1. PartyKit (realtime server)

```bash
npx partykit deploy
```

Note the host (e.g. `boardroom.yourname.partykit.dev`).

### 2. Vercel (frontend)

```bash
npx vercel
```

Set environment variable:

```
NEXT_PUBLIC_PARTYKIT_HOST=boardroom.yourname.partykit.dev
```

## Features

| Feature | Implementation |
|---------|----------------|
| Real-time sync | PartyKit WebSocket rooms |
| Drag & drop | @dnd-kit with smooth overlay animations |
| Optimistic UI | Local state updates immediately, rollback on conflict/failure |
| Connection states | Live / Reconnecting / Offline indicators |
| Offline queue | Actions persisted to localStorage, flushed on reconnect |
| Conflicts | Last-write-wins with toast when your move is overwritten |
| Presence | Colored avatars for everyone in the room |
| No auth | Random username generated on join (sessionStorage) |

## Project structure

```
party/board.ts          ← PartyKit server (state, sync, conflicts)
src/hooks/useBoard.ts   ← Client realtime hook (optimistic + queue)
src/components/         ← Kanban UI
CASE_STUDY.md           ← Architecture & tradeoffs
```

## Author

Oluwaseun Olugbewesa — [Portfolio](https://seun-olugbewesa.netlify.app/)
