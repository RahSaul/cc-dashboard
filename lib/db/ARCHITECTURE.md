# Database Layer Architecture

Three files make up the database layer: a connection pool, the schema DDL, and all query functions. There is no ORM — everything is raw parameterized SQL.

---

## Files

| File | Role |
|---|---|
| `index.ts` | Creates and exports a single `pg.Pool` instance |
| `schema.ts` | Exports the `CREATE_TABLES` SQL string (DDL for all tables and indexes) |
| `queries.ts` | ~15 exported async functions covering all reads and writes |

---

## Connection Management

`index.ts` creates one `Pool` instance per Node.js process using `DATABASE_URL`. Because each Next.js serverless function invocation runs in its own process, there is no cross-request pool sharing to worry about. The pool works with both standard TCP Postgres (local dev) and Neon's serverless Postgres (production) — both accept the standard `pg` driver.

---

## Schema

### `plaid_items`
One row per bank connection (Plaid "item"). Stores the `access_token` needed to call the Plaid API on the user's behalf.

- `access_token` is stored in plaintext. This is acceptable for a single-user private deployment. Do not deploy this publicly without encrypting at-rest.
- `transactions_cursor` is `NULL` until the first sync for this item. A `NULL` cursor tells `fetchTransactions` to fetch the full transaction history rather than a delta.
- `last_synced_at` is `NULL` for brand-new items. `runSync` checks this to decide whether to bypass the cooldown and daily cap (new items always get an immediate sync).

### `accounts`
One row per credit card account returned by Plaid.

- FK to `plaid_items(id)` with `ON DELETE CASCADE` — removing a Plaid item removes all its accounts.
- Only credit-type accounts are stored (filtered in `lib/plaid/sync.ts` before the upsert).
- `current_balance` for credit cards is the amount currently owed (a positive number means debt), not available funds. This is Plaid's convention.

### `transactions`
One row per transaction.

- FK to `accounts(id)` with `ON DELETE CASCADE` — removing an account removes all its transactions.
- `amount` is positive for a charge (money leaving the user) and negative for a payment or credit. This is Plaid's convention; no sign flip is applied.
- `pending` is updated on every sync — a transaction can move from pending to posted.
- Two indexes to avoid sequential scans:
  - `idx_transactions_account_date` on `(account_id, date DESC)` — used by per-account queries
  - `idx_transactions_date` on `(date DESC)` — used by cross-account queries

### `plaid_connections_log`
Append-only audit log. One row is inserted for every successful `POST /api/plaid/exchange-token`. `countLifetimePlaidConnections()` queries the total count to enforce `MAX_LIFETIME_PLAID_CONNECTIONS`.

### `sync_log`
Append-only audit log. One row per successful sync run (inserted by `logSync(triggeredBy)`). Used by:
- `countTodaySyncs()` — counts rows where `synced_at >= date_trunc('day', NOW())` to enforce `MAX_DAILY_SYNCS`
- `getLastSyncInfo()` — reads the most recent row to compute the cooldown state

The `triggered_by` column was added after the table was first created. The DDL includes `ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS triggered_by TEXT` so re-running `migrate.ts` is always safe.

---

## Upsert-Everywhere Pattern

Every write in `queries.ts` uses `INSERT ... ON CONFLICT (id) DO UPDATE SET ...`. Plaid's sync API can return the same account or transaction across multiple syncs (e.g., a pending transaction whose details were updated). Unconditional upserts mean:

- Re-running a sync is always idempotent
- There is no need for a pre-read before every write
- Removed transactions are handled separately via `deleteTransactions(ids)` (Plaid's `removed` array)

---

## Type Casting in Read Queries

**`NUMERIC` → `float`:** Amount columns are stored as `NUMERIC(12, 2)` for precision. When read, they are cast with `::float` (e.g., `amount::float AS amount`). Without the cast, `pg` returns numeric values as JavaScript strings, which would break JSON serialization and arithmetic in the UI.

**`DATE` / `TIMESTAMPTZ` → `::text`:** Date and timestamp columns are cast to `::text` before returning (e.g., `date::text AS date`). Without the cast, `pg` automatically converts them to JavaScript `Date` objects, which then serialize to ISO 8601 with timezone info. The explicit `::text` cast guarantees a consistent string format across all environments and removes the ambiguity of timezone conversion in the driver.

---

## Query Function Reference

### Plaid items
| Function | Description |
|---|---|
| `upsertPlaidItem(item)` | Insert or update a plaid_items row |
| `getAllPlaidItems()` | Fetch all items ordered by creation time |
| `updatePlaidItemCursor(itemId, cursor)` | Update cursor and `last_synced_at` after a sync |
| `deletePlaidItem(itemId)` | Delete item (cascades to accounts + transactions) |
| `countLifetimePlaidConnections()` | Count all rows in `plaid_connections_log` |
| `logPlaidConnection()` | Append a row to `plaid_connections_log` |

### Accounts
| Function | Description |
|---|---|
| `upsertAccount(account)` | Insert or update an account row |
| `getAllAccounts()` | Fetch all accounts with a JOIN to get `institution_name` |

### Transactions
| Function | Description |
|---|---|
| `upsertTransactions(transactions[])` | Insert or update transaction rows (one query per row) |
| `deleteTransactions(ids[])` | Delete by ID array (Plaid's `removed` list) |

### Dashboard reads (no Plaid calls)
| Function | Description |
|---|---|
| `getRecentTransactions(accountId?, days?)` | Last 20 transactions, optionally filtered by account |
| `getSpendingByDay(accountId?, days?)` | Daily spend totals for the chart |
| `getCategoryBreakdown(accountId?, days?)` | Per-category spend totals |
| `getAggregateStats()` | Portfolio-wide balance, limit, and available credit totals |

### Sync audit
| Function | Description |
|---|---|
| `logSync(triggeredBy)` | Append a row to `sync_log` |
| `countTodaySyncs()` | Count today's sync_log rows |
| `getLastSyncInfo()` | Fetch the most recent sync_log row |
