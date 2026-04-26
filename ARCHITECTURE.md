# Architecture Overview

A personal credit card dashboard that connects bank accounts via Plaid, stores transaction and balance data in PostgreSQL, and presents it in a Next.js web UI. Single-user, Google OAuth gated via an email allowlist.

---

## System Diagram

```
                        ┌─────────────────────────────────┐
                        │        Next.js (App Router)      │
                        │                                  │
  Browser ─────────────▶│  /app/page.tsx (dashboard UI)   │
                        │  /app/login, /unauthorized       │
                        │                                  │
  Plaid Link SDK ───────▶│  POST /api/plaid/create-link-token │
  (runs in browser)     │  POST /api/plaid/exchange-token  │
                        │  POST /api/plaid/remove-item     │
                        │                                  │
  Browser ─────────────▶│  GET  /api/dashboard             │
                        │  POST /api/sync/trigger          │
                        │                                  │
  Cron Scheduler ───────▶│  POST /api/sync   (CRON_SECRET) │
                        │         │                        │
                        └─────────┼────────────────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
                    ▼             ▼              ▼
              PostgreSQL      Plaid API     Google OAuth
```

---

## Key Design Decisions

**Single-user, email-allowlist auth.** There is no user table. `ALLOWED_EMAILS` in `.env.local` is the only access gate. NextAuth validates each Google sign-in against this list and redirects unauthorized emails to `/unauthorized`. This eliminates multi-tenancy complexity at the cost of flexibility.

**No ORM.** All database access is raw parameterized SQL via the `pg` pool in `lib/db/queries.ts`. This keeps the query layer explicit and avoids hidden N+1 patterns.

**SWR polling, not WebSockets.** The dashboard auto-refreshes every 60 seconds via SWR's `refreshInterval`. This is intentionally simple — the data source (Plaid) only updates when a sync runs, so real-time push would add complexity without benefit.

**Plaid cursor-based incremental sync.** Each `plaid_items` row stores a `transactions_cursor`. Subsequent syncs pass this cursor to Plaid's `/transactions/sync` endpoint and receive only the delta (added, modified, removed). The cursor is always persisted after every sync, even if the delta is empty.

**Application-level rate limiting.** Sync frequency is governed by three env vars (`MAX_DAILY_SYNCS`, `SYNC_COOLDOWN_MINUTES`, `MAX_LIFETIME_PLAID_CONNECTIONS`). These are enforced in `lib/plaid/runSync.ts`, not at the database or network layer. New items (first sync) bypass these limits so a newly connected card always gets an immediate sync.

**Upsert everywhere.** Every write to the database uses `INSERT ... ON CONFLICT DO UPDATE`. Plaid can return the same account or transaction across multiple syncs; idempotent upserts mean re-running a sync is always safe.

---

## Directory Map

```
/
├── app/                   Next.js App Router — pages, API routes, server actions
│   ├── api/               API route handlers (dashboard, plaid, sync)
│   ├── actions/           Server actions (sign-out)
│   ├── login/             Google OAuth sign-in page
│   └── unauthorized/      Access-denied page
├── components/dashboard/  React UI components (all presentational except PlaidLinkButton)
├── hooks/                 useDashboardData — SWR wrapper for GET /api/dashboard
├── lib/
│   ├── db/                pg pool, schema DDL, all SQL query functions
│   └── plaid/             Plaid SDK client, sync helpers, sync orchestrator
├── scripts/               One-off developer scripts (migrate, seed, test-sync)
├── types/                 Shared TypeScript interfaces
├── public/                Static assets
├── auth.ts                NextAuth configuration (Google provider + email allowlist)
└── proxy.ts               Next.js middleware — redirects unauthenticated requests to /login
```

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `PLAID_CLIENT_ID` | Plaid API client ID | required |
| `PLAID_SECRET` | Plaid API secret | required |
| `PLAID_ENV` | Plaid environment (`sandbox` / `production`) | `sandbox` |
| `CRON_SECRET` | Bearer token for `POST /api/sync` (cron endpoint) | required |
| `ALLOWED_EMAILS` | Comma-separated list of authorized Google accounts | required |
| `MAX_LIFETIME_PLAID_CONNECTIONS` | Max total card connections ever allowed | `10` |
| `MAX_DAILY_SYNCS` | Max syncs per calendar day | `10` |
| `SYNC_COOLDOWN_MINUTES` | Minimum minutes between consecutive syncs | `30` |

Generate `CRON_SECRET` with: `openssl rand -hex 32`

---

## Data Flows

**1. Authentication.** The user visits any protected route → `proxy.ts` (Next.js middleware) checks for a NextAuth session → if absent, redirects to `/login` → user clicks "Sign in with Google" → Google OAuth → NextAuth `signIn` callback checks `ALLOWED_EMAILS` → success redirects to `/`, failure redirects to `/unauthorized`.

**2. Dashboard load.** `app/page.tsx` mounts → `useDashboardData()` (`hooks/useDashboardData.ts`) fetches `GET /api/dashboard` → the route handler runs six DB queries in parallel (`lib/db/queries.ts`) → returns a `DashboardData` JSON blob → components render. SWR repeats this every 60 seconds.

**3. Card connection.** User opens CardManagerModal → PlaidLinkButton fetches `POST /api/plaid/create-link-token` (checks lifetime cap first) → Plaid Link SDK opens in the browser → user selects bank and logs in → SDK returns a `public_token` → `POST /api/plaid/exchange-token` exchanges it for a permanent `access_token`, stores a `plaid_items` row, and logs the connection → CardManagerModal triggers `POST /api/sync/trigger` → `runSync()` bypasses rate limits (new item, `last_synced_at` is null) → SWR revalidates.

**4. Manual sync.** User clicks "Sync" → `POST /api/sync/trigger` → `auth()` reads the session for the `triggeredBy` label → `runSync(name)` checks daily cap and cooldown → for each Plaid item: fetch balances, upsert accounts, fetch transactions with cursor, upsert added/modified, delete removed, update cursor → `logSync()` → response includes `lastSync` info for the UI cooldown timer → SWR mutate refreshes the dashboard.

**5. Cron sync.** External scheduler → `POST /api/sync` with `Authorization: Bearer <CRON_SECRET>` → same `runSync('cron')` path as manual sync, same rate limit rules apply.

**6. Card removal.** User clicks Remove in CardManagerModal → `POST /api/plaid/remove-item` with `itemId` → best-effort `plaidClient.itemRemove()` (errors are swallowed) → `deletePlaidItem()` which cascades to `accounts` and `transactions` → `onMutate()` resets state and SWR revalidates.

---

## Cross-Cutting Concerns

**Auth enforcement** lives entirely in `proxy.ts`. Individual API route handlers do not re-check the session — the middleware already blocked unauthenticated requests before they reach the handler. The one exception is `/api/sync/trigger`, which calls `auth()` to read the user's name for the audit log (not for access control).

**All database access is server-side only.** The `pg` pool and all query functions are in `lib/db/` and imported only by API route handlers or `lib/plaid/runSync.ts`. No query function is ever called from a client component.

**Plaid `access_token` values are never sent to the browser.** They are stored in the `plaid_items` table and used only server-side during sync.
