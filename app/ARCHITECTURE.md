# App Router Architecture

This directory contains three distinct concerns that share the same file tree: rendered pages, API route handlers, and a server action. All routing uses the Next.js App Router — there is no Pages Router.

---

## Directory Structure

```
app/
├── layout.tsx              Root layout (fonts, metadata)
├── page.tsx                Main dashboard page (client component)
├── login/
│   └── page.tsx            Google OAuth sign-in page
├── unauthorized/
│   └── page.tsx            Access-denied page
├── actions/
│   └── auth.ts             Server action: handleSignOut
└── api/
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts    NextAuth GET/POST handlers
    ├── dashboard/
    │   └── route.ts        GET /api/dashboard
    ├── plaid/
    │   ├── create-link-token/route.ts   POST
    │   ├── exchange-token/route.ts      POST
    │   └── remove-item/route.ts         POST
    └── sync/
        ├── route.ts                     GET|POST (cron)
        └── trigger/route.ts             POST (manual)
```

---

## Pages

**`layout.tsx`** — Sets the Geist font family via CSS variables and basic `<head>` metadata. Auth enforcement is **not** here — it is handled upstream in `proxy.ts` (Next.js middleware) before the layout ever renders.

**`page.tsx`** — The entire dashboard UI as a single client component (`'use client'`). It owns all top-level state:

| State | Type | Purpose |
|---|---|---|
| `selectedAccountId` | `string \| null` | Which account the charts are filtered to |
| `manageOpen` | `boolean` | Whether CardManagerModal is open |
| `syncing` | `boolean` | Whether a manual sync is in flight |
| `lastSync` | `LastSyncInfo \| null` | Last sync metadata (for the cooldown timer) |
| `syncError` | `string \| null` | Error message from a failed/rate-limited sync |

It fetches data via `useDashboardData(selectedAccountId)` and passes slices down to each component as props. After a sync or card change it calls `mutate()` to force an immediate SWR revalidation without waiting for the 60-second interval.

**`login/page.tsx`** and **`unauthorized/page.tsx`** — Static pages with no app logic. Login renders the Google OAuth button; unauthorized is a dead-end shown when the user's email is not in `ALLOWED_EMAILS`.

---

## Server Action

**`actions/auth.ts` — `handleSignOut()`**

```ts
'use server'
export async function handleSignOut() {
  await signOut({ redirectTo: '/login' })
}
```

Used in `page.tsx` as a `<form action={handleSignOut}>` rather than a client-side fetch. The reason: Next.js server actions support progressive enhancement (the form works without JS), and there is no need for a dedicated API route just to call `signOut`.

---

## API Routes

| Route | Method | Auth mechanism | Returns |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | none (public) | NextAuth handlers |
| `/api/dashboard` | GET | Session (via `proxy.ts` middleware) | `DashboardData` |
| `/api/plaid/create-link-token` | POST | Session (via middleware) | `{ link_token: string }` |
| `/api/plaid/exchange-token` | POST | Session (via middleware) | `{ success: true, item_id: string }` |
| `/api/plaid/remove-item` | POST | Session (via middleware) | `{ success: true }` |
| `/api/sync/trigger` | POST | Session (via middleware) + reads session for audit log | `SyncResult & { lastSync: LastSyncInfo \| null }` |
| `/api/sync` | GET, POST | `CRON_SECRET` bearer token | `SyncResult` |

---

## Auth Enforcement Model

Route-level auth is handled by `proxy.ts` (Next.js middleware), not by individual handlers. Every request that reaches an API handler has already passed the session check. Handlers do not call `auth()` for access control.

The one exception is `POST /api/sync/trigger`: it calls `auth()` to read `session.user.name ?? session.user.email` and passes it as the `triggeredBy` string to `runSync()` for the audit log. If the session is somehow absent the value falls back to `'unknown'` — there is no auth check here, the middleware already covered it.

`POST /api/sync` (the cron endpoint) is exempt from the session middleware because it uses a different auth mechanism: a static `CRON_SECRET` bearer token validated directly in the handler. The middleware (`proxy.ts`) passes `/api/auth/*` as a public path, but `/api/sync` is still protected by the session middleware — so the cron caller must provide the bearer token, not a session cookie.

---

## Error Response Conventions

All handlers return JSON errors using `Response.json({ error: '...' }, { status: N })`:

| Status | Meaning |
|---|---|
| `400` | Missing or invalid request body (e.g., no `public_token`) |
| `401` | Missing or wrong `CRON_SECRET` bearer token |
| `404` | Resource not found (e.g., `itemId` not in DB) |
| `409` | Limit reached (e.g., `MAX_LIFETIME_PLAID_CONNECTIONS` exceeded) |
| `500` | Unhandled DB or Plaid error (implicit — no explicit 500 handlers) |
