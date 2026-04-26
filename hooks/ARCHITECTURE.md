# Hooks Architecture

One hook: `useDashboardData`. It is the sole data-fetching layer between the dashboard UI and the server.

---

## `useDashboardData(accountId?)`

Wraps SWR to fetch `GET /api/dashboard`. Returns:

```ts
{
  data: DashboardData | undefined,
  isLoading: boolean,
  error: Error | undefined,
  mutate: () => void,
}
```

`data` is `undefined` during the initial load. `app/page.tsx` renders a loading spinner while `isLoading` is `true`. See `types/index.ts` for the full `DashboardData` shape.

---

## URL as Cache Key

The `accountId` parameter is appended as a query string:

```ts
const url = accountId
  ? `/api/dashboard?accountId=${encodeURIComponent(accountId)}`
  : '/api/dashboard'
```

SWR treats the URL as the cache key. Switching from one account to another changes the URL, which means:
- SWR fetches fresh data for the new key
- The previous account's data stays cached in memory (fast if the user switches back)
- There is no risk of showing the previous account's data while the new fetch is in flight

---

## SWR Configuration

```ts
{
  refreshInterval: 60_000,
  revalidateOnFocus: false,
}
```

**`refreshInterval: 60_000`** — The dashboard polls automatically every 60 seconds. This keeps data roughly fresh without the user having to click anything. The polling interval is intentionally longer than the minimum `SYNC_COOLDOWN_MINUTES` (30 min by default), so polling alone will never trigger new syncs.

**`revalidateOnFocus: false`** — Disabled because the dashboard is a long-lived single tab. With focus revalidation enabled, every time the user alt-tabs away and returns, SWR would fire a fetch. This is fine for most apps but here it would create confusing UX: the "Sync" button would appear to do nothing because background revalidation already fired. Disabling it keeps the user's mental model simple — the dashboard refreshes every 60s or when you click Sync.

---

## `mutate()` Usage Pattern

`mutate()` forces an immediate SWR revalidation without waiting for the next 60-second tick. `app/page.tsx` calls it in two situations:

1. **After a manual sync** — the `handleSync` function calls `mutate()` after `POST /api/sync/trigger` resolves, so the dashboard updates reflect the newly synced data
2. **After a card change** — `handleMutate()` (called by CardManagerModal via `onMutate`) resets `selectedAccountId` to `null` and calls `mutate()`, returning the view to "All Cards" with fresh data after a connect or disconnect
