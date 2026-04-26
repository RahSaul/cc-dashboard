# Type System Architecture

`index.ts` is the single source of truth for all shared TypeScript interfaces. These types are shared across three layers — the database query functions, the API route handlers, and the UI components. Changing a type shape requires updating all three.

---

## Type-to-Database Mapping

| TypeScript type | DB source | Notes |
|---|---|---|
| `Account` | `accounts` JOIN `plaid_items` | `institution_name` comes from the `plaid_items` JOIN, not the `accounts` table itself |
| `Transaction` | `transactions` | `amount` is `NUMERIC(12,2)` in DB; returned as `number` via `::float` cast in queries |
| `SpendingByDay` | `transactions` (aggregated) | Computed on read; no dedicated table |
| `CategoryBreakdown` | `transactions` (aggregated) | Computed on read; `category` maps to `category_primary` column with `COALESCE(..., 'Other')` |
| `AggregateStats` | `accounts` (aggregated) | Computed on read; camelCase field names come from SQL column aliases (`"totalBalance"`) |
| `LastSyncInfo` | `sync_log` | `cooldownRemainingMs` is computed in `buildLastSyncInfo()` from `SYNC_COOLDOWN_MINUTES`; not stored in DB |
| `DashboardData` | Composite | The full response shape for `GET /api/dashboard`; assembled in the route handler |

---

## Nullable Fields

Not all nullable fields are nullable for the same reason:

**Nullable because Plaid does not always return a value:**
- `Account.official_name` — some institutions don't provide a formal card name
- `Account.subtype` — not always present
- `Account.institution_name` — populated from the exchange-token metadata, not always available
- `Transaction.merchant_name` — Plaid returns this for many but not all transactions
- `Transaction.category_primary` / `category_detail` — requires Plaid's personal finance category feature; absent for some transactions
- `Transaction.authorized_date` — only present if the transaction was pre-authorized

**Nullable because the data has not been synced yet:**
- `Account.last_synced_at` — `null` for a freshly connected card that has never been through a sync. `runSync` uses this to identify new items and bypass rate limits.
- `Account.current_balance`, `available_credit`, `credit_limit` — Plaid may return `null` for these if the institution did not provide the data at the time of the balance fetch.

**Nullable because the event has not occurred:**
- `DashboardData.lastSync` — `null` when no sync has ever run (fresh database)
- `LastSyncInfo.by` — `null` if `triggered_by` was not recorded (legacy rows before the column was added)

---

## Amount Sign Convention

For credit card accounts, Plaid uses the following convention — and this app preserves it without modification:

- **Positive `amount`** = a charge (money leaving the user, e.g., a purchase)
- **Negative `amount`** = a payment or credit (money coming in, e.g., a payment to the card issuer)

No sign flip is applied anywhere in the codebase. The UI renders amounts as-is; a positive value is a charge and should be displayed as an expense.

---

## Date Format

All date fields in TypeScript types are `string`. The format is enforced by explicit `::text` casts in `lib/db/queries.ts`:

- `DATE` columns → cast to `::text` → produces `'YYYY-MM-DD'` strings
- `TIMESTAMPTZ` columns → cast to `::text` → produces ISO 8601 strings with timezone offset

Without these casts, the `pg` driver would auto-convert dates to JavaScript `Date` objects, which serialize differently depending on the local timezone of the server. The `::text` cast makes the format explicit and consistent.

---

## Cross-Layer Usage

```
types/index.ts
       │
       ├── lib/db/queries.ts          returns typed rows from SQL
       ├── lib/plaid/sync.ts          maps Plaid API objects to Transaction / Account
       ├── lib/plaid/runSync.ts       uses SyncResult, LastSyncInfo
       ├── app/api/dashboard/route.ts assembles DashboardData
       ├── hooks/useDashboardData.ts  typed SWR return value
       └── components/dashboard/      prop types for all components
```

When adding a new field, the typical sequence is:
1. Add the column to `lib/db/schema.ts` and re-run `migrate.ts`
2. Add the field to the relevant type in `types/index.ts`
3. Update the SELECT in `lib/db/queries.ts` to include the new column with the appropriate cast
4. Update any API route handler that assembles the response shape
5. Update the component(s) that consume the field
