# Boardroom Server Guide (PartyKit)

A beginner-friendly walkthrough of how the realtime server works and how to change it.

---

## The big picture (30-second version)

Your app has **two servers**:

```
Browser  ←——WebSocket——→  PartyKit (party/board.ts)  ←——storage——→  Saved board data
   ↑
   └── HTTP ──→  Next.js (pages, UI, modals)
```

- **Next.js** serves the website (buttons, modals, drag-and-drop).
- **PartyKit** is the brain that keeps everyone in sync. When you drag a card, the browser tells PartyKit, PartyKit saves it and tells every other browser.

You run both with:

```bash
npm run dev
```

- Next.js → http://localhost:3002
- PartyKit → http://localhost:1999

---

## Step 1: Find the server file

Everything lives in one file:

```
party/board.ts
```

This is your **entire backend** for the demo. No Express, no database setup.

---

## Step 2: Understand "rooms"

Each board URL is a **room**:

```
/board/sprint-12-a3f9b2  →  room ID = "sprint-12-a3f9b2"
```

PartyKit creates one `BoardServer` instance per room. Everyone on the same URL joins the same room and sees the same data.

In the browser (`src/hooks/useBoard.ts`):

```typescript
usePartySocket({
  host: "localhost:1999",  // PartyKit address
  room: roomId,            // e.g. "sprint-12-a3f9b2"
});
```

---

## Step 3: What the server stores

Inside `BoardServer`, there are 4 pieces of state:

```typescript
columns: BoardColumn[]   // Todo, Doing, Done, + any you add
cards: Card[]            // All cards on the board
board: BoardMeta         // Board name, initialized flag
users: Map<...>          // Who's online right now (presence)
```

On startup, it loads from PartyKit storage:

```typescript
async onStart() {
  const stored = await this.room.storage.get("state");
  if (stored) {
    // Use saved data
  } else {
    // Use default template
  }
}
```

After every change, it saves:

```typescript
await this.room.storage.put("state", { columns, cards, board });
```

**You don't need a database** — PartyKit storage handles persistence per room.

---

## Step 4: The 3 server events (lifecycle)

PartyKit calls these automatically:

### `onConnect` — someone opens the board

```typescript
onConnect(conn, ctx) {
  // 1. Read their username from the URL query string
  // 2. Add them to the users map
  // 3. Send them the full board state (sync)
  // 4. Tell everyone else who's online (presence)
}
```

### `onMessage` — someone does something

```typescript
onMessage(raw, sender) {
  const msg = JSON.parse(raw);
  switch (msg.type) {
    case "move_card":    // drag a card
    case "add_card":     // create a card
    case "update_card":  // edit title/description
    case "add_column":   // new column
    case "init_board":   // first-time board setup
  }
}
```

### `onClose` — someone leaves

```typescript
onClose(conn) {
  this.users.delete(conn.id);
  this.broadcastPresence(); // update avatars for everyone
}
```

---

## Step 5: How messages work (the protocol)

Think of it like a language between browser and server.

### Browser → Server (ClientMessage)

Defined in `src/lib/types.ts`:

| Message | When |
|---------|------|
| `init_board` | New board created from modal |
| `add_card` | User creates a card |
| `move_card` | User drags a card |
| `update_card` | User saves card details |
| `add_column` | User adds a column |
| `flush_queue` | Reconnect after offline — send queued actions |

Example — moving a card:

```json
{
  "type": "move_card",
  "cardId": "card-123",
  "column": "doing",
  "order": 0,
  "expectedVersion": 2,
  "userName": "Swift Falcon",
  "clientActionId": "abc123"
}
```

### Server → Browser (ServerMessage)

| Message | When |
|---------|------|
| `sync` | Full board state on connect |
| `card_added` | New card created |
| `card_updated` | Card moved or edited |
| `column_added` | New column |
| `board_updated` | Board renamed |
| `conflict` | Someone else won the edit |
| `presence` | Who's online changed |
| `action_ack` | Your action succeeded/failed |

---

## Step 6: Follow one action end-to-end (drag a card)

```
1. You drag "API contracts" from Todo → Doing
2. Browser IMMEDIATELY moves it (optimistic UI)
3. Browser sends move_card to PartyKit
4. Server checks: is expectedVersion still correct?
   ├── YES → update card, save, broadcast card_updated to ALL browsers
   └── NO  → send conflict to YOU, everyone gets the real card
5. Other browsers receive card_updated and move the card
```

The `version` number on each card is how we detect conflicts (last-write-wins).

---

## Step 7: How to add a new server feature

Example: **delete a card**

### 7a. Add the type (`src/lib/types.ts`)

```typescript
export interface DeleteCardMessage {
  type: "delete_card";
  cardId: string;
  clientActionId: string;
  userName: string;
}

// Add to ClientMessage union
// Add CardDeletedMessage to ServerMessage
```

### 7b. Handle it on the server (`party/board.ts`)

```typescript
// In onMessage switch:
case "delete_card":
  await this.handleDelete(msg, sender);
  break;

// New handler:
private async handleDelete(msg, sender) {
  this.cards = this.cards.filter(c => c.id !== msg.cardId);
  await this.persist();
  this.room.broadcast(JSON.stringify({
    type: "card_deleted",
    cardId: msg.cardId,
  }));
}
```

### 7c. Call it from the client (`src/hooks/useBoard.ts`)

```typescript
const deleteCard = (cardId: string) => {
  socket.send(JSON.stringify({
    type: "delete_card",
    cardId,
    clientActionId: nanoid(),
    userName: identity.name,
  }));
};

// Handle card_deleted in onMessage
```

### 7d. Wire up the UI

Add a delete button in `CardDetailDrawer.tsx` that calls `deleteCard`.

**That's the pattern for every feature:** type → server handler → client send → UI button.

---

## Step 8: Deploy the server to production

### Local (development)

```bash
npm run dev
```

### Production

**1. Deploy PartyKit:**

```bash
npx partykit login
npx partykit deploy
```

You'll get a host like: `boardroom.yourname.partykit.dev`

**2. Tell the frontend where PartyKit lives:**

In Vercel (or `.env.production`):

```
NEXT_PUBLIC_PARTYKIT_HOST=boardroom.yourname.partykit.dev
```

**3. Deploy Next.js:**

```bash
npx vercel
```

Now browsers connect to `wss://boardroom.yourname.partykit.dev/parties/main/ROOM_ID` instead of localhost.

---

## Step 9: File map (what talks to what)

```
src/lib/types.ts          ← Message shapes (shared by client + server)
src/lib/templates.ts      ← Default columns/cards for new boards
party/board.ts            ← THE SERVER (you edit this for backend logic)
src/hooks/useBoard.ts     ← WebSocket client (sends/receives messages)
src/components/Board.tsx  ← UI only (drag-drop, modals)
```

**Rule of thumb:**
- Data logic → `party/board.ts`
- Sync logic → `src/hooks/useBoard.ts`
- Visual stuff → `src/components/`

---

## Step 10: Debugging tips

### Check PartyKit is running

Terminal should show:

```
[pk:inf] Ready on http://0.0.0.0:1999
```

### Check WebSocket in browser

1. Open DevTools → Network → WS
2. Look for connection to `localhost:1999/parties/main/your-room-id`
3. Click it → Messages tab → see JSON going back and forth

### Common issues

| Problem | Fix |
|---------|-----|
| Stuck on skeleton | PartyKit not running — run `npm run dev` |
| Changes don't sync | Wrong host in `.env.local` — should be `localhost:1999` |
| 404 on `/parties/board/...` | Don't set `party: "board"` — use default `main` |
| Port 3000 shows wrong site | Use http://localhost:3002 (see terminal output) |

### Add a server log

In `party/board.ts`:

```typescript
async onMessage(raw: string, sender: Party.Connection) {
  const msg = JSON.parse(raw);
  console.log("Received:", msg.type, msg);  // shows in PartyKit terminal
  // ...
}
```

---

## What to build next (server-side)

| Feature | Difficulty | Server change |
|---------|------------|---------------|
| Delete card | Easy | `handleDelete` |
| Delete column | Easy | `handleDeleteColumn` + move cards |
| Rename column | Easy | `handleUpdateColumn` |
| Comments | Medium | New `comments[]` array per card |
| Activity log | Medium | Append-only `activities[]` on each action |
| Assignee | Easy | Add `assignee` field to Card |
| Auth | Hard | Verify tokens in `onConnect` |

---

## Glossary

| Term | Meaning |
|------|---------|
| **PartyKit** | Service that runs WebSocket rooms |
| **Room** | One board instance (one URL) |
| **WebSocket** | Persistent connection for instant updates |
| **Optimistic UI** | Update screen before server confirms |
| **LWW** | Last-write-wins — newest version wins on conflict |
| **Presence** | Who's currently viewing the board |
| **clientActionId** | Unique ID to match optimistic updates with server responses |

---

You've got this. Start by adding `console.log` in `onMessage`, drag a card, and watch the terminal. That's the fastest way to understand the flow.
