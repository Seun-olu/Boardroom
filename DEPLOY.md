# Deploying Boardroom (Netlify + PartyKit)

## Is one codebase fine for the whole backend?

**Yes.** This is the standard PartyKit layout:

```
your-repo/
├── party/board.ts     ← realtime server (deploys to PartyKit cloud)
├── src/               ← Next.js frontend (deploys to Netlify)
└── partykit.json      ← PartyKit config
```

The frontend and backend live in one repo but deploy to **two different hosts**:

| Part | Host | Why |
|------|------|-----|
| Website (UI) | **Netlify** | Static pages + Next.js SSR |
| Realtime server | **PartyKit** | WebSockets, rooms, persistence |

Netlify **cannot** run your PartyKit WebSocket server. It doesn't do long-lived connections the way a board needs. PartyKit is built exactly for this — and it's free to start.

For a portfolio kanban demo, this split is industry-normal and interview-friendly.

---

## Architecture when live

```
User browser
    │
    ├── HTTPS ──→  your-boardroom.netlify.app     (Next.js on Netlify)
    │
    └── WSS   ──→  boardroom.you.partykit.dev     (PartyKit server)
```

Same repo. Two deploys. One env var connects them.

---

## Step 1: Deploy the server (PartyKit)

Do this **first** — you need the host URL for Netlify.

### If dashboard.partykit.io shows a 500 error

That's a **PartyKit platform bug** on their website — not your project. The Cloudflare token **does not replace** PartyKit login. You need **both**:

1. **PartyKit auth** (pick one):
   - GitHub token (no browser — recommended when dashboard is broken)
   - `PARTYKIT_LOGIN` + `PARTYKIT_TOKEN`
   - Browser login via CLI

2. **Cloudflare credentials** — only if using cloud-prem with a custom domain

#### Option A — GitHub token (bypasses broken dashboard)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. No special scopes needed for basic deploy (public repo access is enough)
3. Run:

```bash
GITHUB_LOGIN=your_github_username \
GITHUB_TOKEN=ghp_your_token_here \
npx partykit deploy
```

Deploys to: `boardroom.yourusername.partykit.dev` — use that as `NEXT_PUBLIC_PARTYKIT_HOST` on Netlify.

#### Option B — Cloud-prem (your Cloudflare account)

Requires a **domain on Cloudflare** (e.g. `boardroom.yourdomain.com`).

1. Add to `partykit.json`:
   ```json
   "domain": "boardroom.yourdomain.com"
   ```
2. Run **all four** env vars:

```bash
GITHUB_LOGIN=your_github_username \
GITHUB_TOKEN=ghp_your_token_here \
CLOUDFLARE_ACCOUNT_ID=your_account_id \
CLOUDFLARE_API_TOKEN=your_cloudflare_token \
npx partykit deploy
```

Without `domain` in `partykit.json`, Cloudflare vars are ignored and it still tries PartyKit managed hosting + browser login.

#### Option C — CLI device login

```bash
npm run party:deploy
```

Opens `dashboard.partykit.io/login/device` — may work even when the main dashboard 500s.

You'll get a host like:

```
boardroom.yourusername.partykit.dev
```

Save that. Set it as `NEXT_PUBLIC_PARTYKIT_HOST` on Netlify (hostname only, no `https://`).

---

## Step 2: Deploy the website (Netlify)

### Option A — Netlify UI (easiest)

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Select your repo
4. Build settings (usually auto-detected via `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish:** handled by Next.js plugin
5. **Environment variables** → Add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_PARTYKIT_HOST` | `boardroom.yourusername.partykit.dev` |

   No `https://` — just the hostname.

6. Deploy

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set NEXT_PUBLIC_PARTYKIT_HOST boardroom.yourusername.partykit.dev
netlify deploy --prod
```

---

## Step 3: Verify it works

1. Open your Netlify URL
2. Create a board
3. Open DevTools → Network → **WS**
4. You should see a WebSocket to:
   ```
   wss://boardroom.yourusername.partykit.dev/parties/main/YOUR-ROOM-ID
   ```
5. Open the same board link in two tabs — cards should sync

---

## What runs where (cheat sheet)

| File / folder | Runs on |
|---------------|---------|
| `src/app/*`, `src/components/*` | Netlify |
| `src/hooks/useBoard.ts` | Browser (talks to PartyKit) |
| `party/board.ts` | PartyKit cloud |
| `src/lib/types.ts` | Shared (types only, bundled into both) |

You **never** deploy `party/` to Netlify. Netlify ignores it — only the `npm run build` output matters for the site.

---

## Custom domain

**Netlify:** Site settings → Domain management → add `boardroom.yourdomain.com`

**PartyKit:** Uses `*.partykit.dev` by default on free tier. Custom domains on PartyKit may need a paid plan — for a portfolio demo, `partykit.dev` subdomain is fine.

---

## CI/CD (optional, recommended)

### Netlify
Connects to GitHub automatically — every push to `main` redeploys the site.

### PartyKit
Add to GitHub Actions (`.github/workflows/deploy-partykit.yml`):

```yaml
name: Deploy PartyKit
on:
  push:
    branches: [main]
    paths:
      - "party/**"
      - "partykit.json"
      - "src/lib/types.ts"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npx partykit deploy
        env:
          PARTYKIT_LOGIN: ${{ secrets.PARTYKIT_LOGIN }}
```

Get `PARTYKIT_LOGIN` token from `npx partykit token generate`.

Or just run `npm run party:deploy` manually when you change server code.

---

## When would you split repos or change hosts?

| Situation | Recommendation |
|-----------|----------------|
| Portfolio demo (now) | One repo, Netlify + PartyKit ✅ |
| Team with separate BE team | Could split `party/` to its own repo — optional |
| Need Postgres + SQL | Add Supabase alongside PartyKit, or migrate off PartyKit |
| Enterprise / self-host | Railway, Fly.io, or AWS for Socket.io server |

For Boardroom's scope, **one repo is correct**. Don't over-engineer.

---

## Troubleshooting live

| Symptom | Fix |
|---------|-----|
| Board loads but never syncs | Check `NEXT_PUBLIC_PARTYKIT_HOST` on Netlify |
| Still connecting to localhost | Env var not set or site not redeployed after adding it |
| Works locally, not live | Run `npm run party:deploy` — server might not be deployed |
| CORS / connection refused | Host should be hostname only, no protocol |

---

## Cost

- **Netlify:** Free tier is enough for a portfolio site
- **PartyKit:** Free tier covers demo traffic

Total: **$0** to ship this.
