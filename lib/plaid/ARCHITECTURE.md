# Plaid Integration Architecture

Three files. Only one of them — `runSync.ts` — is called by API routes. The other two are internal to the Plaid layer.

---

## File Roles

| File | Role |
|---|---|
| `client.ts` | Constructs and exports the singleton `PlaidApi` instance |
| `sync.ts` | Pure Plaid API translation: fetches balances and transactions, maps to app types |
| `runSync.ts` | Orchestrator: enforces rate limits, drives the sync loop, logs results |

API routes import only from `runSync.ts`. `sync.ts` and `client.ts` are internal.

---

## `client.ts`

Reads `PLAID_ENV` (defaults to `'sandbox'`) and uses it to select the correct Plaid base URL via `PlaidEnvironments[env]`. Valid values: `sandbox`, `development`, `production`. Credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`) are injected as request headers on every Plaid API call.

---

## `sync.ts`

### `fetchBalances(accessToken)`
Calls Plaid's `accountsBalanceGet` with `min_last_updated_datetime` set to yesterday (forces Plaid to return fresh balances rather than cached ones). Filters the response to accounts where `type === 'credit'`. Debit/checking accounts that exist under the same Plaid item are discarded here.

The returned `Account` objects have `item_id: ''` — this is a placeholder. The caller (`runSync`) fills in the real `item_id` before upserting.

### `fetchTransactions(accessToken, cursor)`
Implements Plaid's cursor-based transaction sync in a `while (hasMore)` loop:

1. If `cursor` is `null`, passes `cursor: undefined` to Plaid → Plaid returns the full transaction history
2. Accumulates `added`, `modified`, and `removed` arrays across all pages
3. On each iteration, updates `currentCursor` to `data.next_cursor`
4. Exits when `data.has_more === false`
5. Returns `{ added, modified, removed, nextCursor }`

`nextCursor` is always the final value of `data.next_cursor`. The caller must persist this even if the delta arrays are all empty, so the next sync starts from the right position.

### `mapTransaction(t)` (private)
Maps a raw Plaid transaction object to the app's `Transaction` type. Notable mappings:
- `t.transaction_id` → `id`
- `t.personal_finance_category?.primary` → `category_primary`
- `t.personal_finance_category?.detailed` → `category_detail`
- `t.amount` is preserved as-is (positive = charge, negative = payment/credit)

---

## `runSync.ts`

### Sync Algorithm

```
runSync(triggeredBy)
  │
  ├─ getAllPlaidItems()
  │
  ├─ hasNewItems = items.some(item => item.last_synced_at === null)
  │
  ├─ if !hasNewItems:
  │    ├─ countTodaySyncs() >= MAX_DAILY_SYNCS → return { synced: false, reason: 'cap_reached' }
  │    └─ getLastSyncInfo() age < SYNC_COOLDOWN_MINUTES → return { synced: false, reason: 'cooldown' }
  │
  ├─ for each item:
  │    ├─ fetchBalances(item.access_token)
  │    ├─ upsertAccount({ ...account, item_id: item.id })  ← fills in item_id
  │    ├─ savedAccountIds = new Set(accounts.map(a => a.id))
  │    ├─ fetchTransactions(item.access_token, item.transactions_cursor)
  │    ├─ filter added/modified to savedAccountIds only
  │    ├─ deleteTransactions(removed)
  │    ├─ upsertTransactions([...filteredAdded, ...filteredModified])
  │    └─ updatePlaidItemCursor(item.id, nextCursor)  ← also sets last_synced_at = NOW()
  │
  └─ logSync(triggeredBy)
```

### Rate Limiting

All three rate limits are checked before the sync loop starts:

| Limit | Env var | Default | Check |
|---|---|---|---|
| Daily cap | `MAX_DAILY_SYNCS` | `10` | `countTodaySyncs()` counts `sync_log` rows for today |
| Cooldown | `SYNC_COOLDOWN_MINUTES` | `30` | Age of last `sync_log` row vs. cooldown duration |
| Connection cap | `MAX_LIFETIME_PLAID_CONNECTIONS` | `10` | Checked at `/api/plaid/create-link-token` and `/api/plaid/exchange-token`, **not** here |

**New-item bypass:** If any item has `last_synced_at = null` (it has never been synced), both the daily cap and the cooldown are skipped entirely. This ensures a newly connected card is always synced immediately regardless of recent activity.

### Account Filtering (Double Guard)

`fetchBalances` already filters to credit-type accounts at the Plaid API level. `runSync` adds a second filter: it builds `savedAccountIds` from the accounts returned by `fetchBalances` and then filters `added` and `modified` transactions to only those whose `account_id` is in that set.

Why: Plaid's `transactionsSync` can return transactions for accounts that `fetchBalances` filtered out (e.g., a debit account on the same item). Without this filter, those transactions would fail the FK constraint when upserting (since the account row doesn't exist).

### `buildLastSyncInfo(row)`

Exported separately for use by both `GET /api/dashboard` and `POST /api/sync/trigger`. Takes the raw `sync_log` row (or `null`) and computes:

```ts
{
  at: row.synced_at.toISOString(),
  by: row.triggered_by,
  cooldownRemainingMs: Math.max(0, cooldownMs - ageMs),
}
```

`cooldownRemainingMs` drives the UI "available in Xm" display and the disabled state of the Sync button.

---

## Cron vs. Manual Triggers

Both paths call the same `runSync()` function with the same rate limits. The difference is only in auth and the `triggeredBy` label:

| Trigger | Route | Auth | `triggeredBy` value |
|---|---|---|---|
| Manual | `POST /api/sync/trigger` | NextAuth session (via middleware) | `session.user.name ?? session.user.email ?? 'unknown'` |
| Cron | `POST /api/sync` | `CRON_SECRET` bearer token | `'cron'` |

The `triggeredBy` value is stored in `sync_log.triggered_by` and shown in the dashboard's "Last synced by X" display.
