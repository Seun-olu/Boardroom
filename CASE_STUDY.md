# Boardroom — Case Study

> **Note (2026-11):** This case study describes an earlier PartyKit prototype. The current app uses
> **Next.js API routes + Supabase Postgres + Supabase Realtime** (see `README.md`). The document will be
> rewritten to match the hardened architecture when that work lands.

**Author:** Oluwaseun Olugbewesa  
**Scope:** One board, three columns, one week  
**Live demo:** _Deploy with instructions in README_  
**Repo:** _Push to GitHub after local verification_

---

## Problem

At Clannit I shipped real-time messaging and live updates. Recruiters and hiring managers can't see that work — they see REST forms and static portfolios. I needed a small, focused piece that proves I understand the hard edges of real-time UX: optimistic updates, connection states, presence, and conflict resolution.

**Boardroom** is that proof. Not Slack. Not a full project manager. One shared kanban board where multiple people drag cards and see changes instantly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (×N)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  @dnd-kit    │  │  useBoard()  │  │  localStorage queue  │  │
│  │  drag/drop   │→ │  optimistic  │→ │  (offline actions)   │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────────┘  │
│                           │ WebSocket                           │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PARTYKIT SERVER (party/board.ts)               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ Room state  │  │  Presence    │  │  PartyKit Storage   │    │
│  │ (cards[])   │  │  (users map) │  │  (persist cards)    │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
│                                                                 │
│  Conflict: last-write-wins via version counter per card         │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow — card move

1. User drops card → **optimistic local update** (instant)
2. Client sends `move_card` with `expectedVersion` + `clientActionId`
3. Server checks version:
   - **Match** → increment version, broadcast `card_updated`, ack client
   - **Stale** → send `conflict` to sender, broadcast authoritative card
4. Sender rolls back optimistic state + shows toast: _"Move overwritten"_

### Data flow — offline

1. `navigator.onLine === false` or socket closed mid-action
2. Action pushed to **localStorage queue** (keyed by room ID)
3. UI shows **Offline** + queued count
4. On reconnect → `flush_queue` sends all pending actions in order
5. Server processes sequentially (last-write-wins still applies)

---

## Tech choices & tradeoffs

### Why PartyKit over Supabase / Socket.io?

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **PartyKit** | Room-based URLs, presence, storage, free tier, zero DB setup | Smaller ecosystem | **Chosen** — fastest path to reliable rooms |
| Supabase Realtime | Postgres persistence, RLS, familiar | Requires schema + env setup, overkill for demo | Good for production, heavy for 1-week scope |
| Socket.io | Full control | Needs persistent server (not Vercel-friendly), more infra | Ruled out for serverless deploy |

PartyKit gives me shareable room URLs (`/board/alpha-x7k2`), built-in connection lifecycle, and durable storage without standing up a database.

### Conflict resolution: last-write-wins

I considered CRDTs (Yjs) and operational transforms. For a 3-column kanban with ~20 cards, **version-based LWW** is sufficient and debuggable. The tradeoff: rapid simultaneous edits on the same card will lose one move — but the loser gets a clear toast, which is better UX than silent data corruption.

### Optimistic UI

Cards move on drop, not on server ack. This is non-negotiable for drag UX — waiting 100–300ms feels broken. The cost is rollback complexity; I track `previousCard` per pending action to restore state on conflict.

### No auth

Random adjective-noun usernames (e.g. "Swift Falcon") stored in `sessionStorage`. Fine for a demo. Production would need identity (even anonymous UUID cookies) for audit trails.

---

## Edge cases handled

| Scenario | Behavior |
|----------|----------|
| Two users drag same card | LWW on server version; loser gets toast + rollback |
| User goes offline mid-drag | Move queued in localStorage; syncs on reconnect |
| First connect | Skeleton loading until `sync` message received |
| Empty board | Centered empty state with CTA to add cards |
| Reconnecting | Amber pulse indicator; actions queue if socket not open |
| Tab share | Copy-link button copies full room URL |

---

## What I'd improve with more time

1. **Operational visibility** — Debug panel showing message log, latency, queue depth (great for demos in interviews)
2. **Yjs integration** — For richer merge semantics if card *content editing* were added
3. **Auth + audit log** — Who moved what, when (needed for enterprise)
4. **E2E tests** — Playwright with two browser contexts dragging simultaneously
5. **Card content editing** — Inline title edit with debounced sync and character-level conflicts
6. **Rate limiting** — Prevent queue flooding on reconnect
7. **Mobile drag** — Touch sensor tuning for smaller screens

---

## Metrics that matter (if this were production)

- Time to first sync (`sync` message latency)
- Optimistic rollback rate (conflicts / total moves)
- Queue depth on reconnect
- Reconnection success rate within 5s

---

## Running locally

```bash
npm install
npm run dev
# → localhost:3000 (Next.js) + localhost:1999 (PartyKit)
```

Open two tabs on the same `/board/[roomId]` URL to test collaboration.

---

_Built in ~1 week. Depth over breadth._
