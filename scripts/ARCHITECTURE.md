# Scripts Architecture

Three standalone developer scripts. They bypass the Next.js runtime entirely — they run via `ts-node` and create their own `pg.Pool` instances rather than importing from `lib/db/index.ts`.

> **Why not import from `lib/db`?** `lib/db/index.ts` throws synchronously if `DATABASE_URL` is not set at import time. In a Next.js context this is fine. In a `ts-node` script the env var may be passed inline on the command line, which means it's present by the time the script's top-level code runs — but only if it's set before the import. Creating a new `Pool` inside the script function avoids this timing issue and keeps the scripts self-contained.

---

## Scripts

### `migrate.ts` — Schema setup

Runs the `CREATE_TABLES` DDL from `lib/db/schema.ts` against the target database. All DDL statements use `IF NOT EXISTS`, so the script is fully idempotent — safe to re-run after adding new tables or columns.

**When to run:** On first deploy, and after any schema change (new table, new column, new index).

**Prerequisites:** `DATABASE_URL`

```sh
DATABASE_URL=<connection_string> npx ts-node --project tsconfig.scripts.json scripts/migrate.ts
```

---

### `seed-fixtures.ts` — Load test data

Inserts two fixture `plaid_items` (Chase, Citi), two accounts, and a set of transactions from `lib/fixtures.ts`. All inserts use `ON CONFLICT DO UPDATE`, so re-running the script refreshes the fixture data rather than duplicating it.

**Caution:** Fixture items have placeholder `access_token` values (`fixture_token_item_chase_001`, etc.). If a real sync runs against these items, it will fail at the Plaid API call. Use this script only for local development with static fixture data — not alongside a real Plaid sandbox connection.

**When to run:** When setting up a local dev environment without a real Plaid sandbox account, or to reset fixture data to a known state.

**Prerequisites:** `DATABASE_URL` (run `migrate.ts` first so the tables exist)

```sh
DATABASE_URL=<connection_string> npx ts-node --project tsconfig.scripts.json scripts/seed-fixtures.ts
```

---

### `test-sync.ts` — Manual sync trigger

POSTs to `POST /api/sync` with the `CRON_SECRET` bearer token. This exercises the full cron sync path (including Plaid API calls and DB upserts) without needing an external scheduler. Requires a running Next.js server.

**When to run:** When debugging a live Plaid sandbox or production integration — for example, to verify that credentials are correct, that the cursor is advancing, or that transactions are landing in the database.

**Prerequisites:** `CRON_SECRET`, a running Next.js server (default `http://localhost:3000`), and valid `PLAID_*` env vars on the server

```sh
CRON_SECRET=<secret> npx ts-node --project tsconfig.scripts.json scripts/test-sync.ts

# Against a deployed environment:
CRON_SECRET=<secret> BASE_URL=https://your-domain.com npx ts-node --project tsconfig.scripts.json scripts/test-sync.ts
```

---

## When to Run Which Script

| Script | Run when |
|---|---|
| `migrate.ts` | First deploy; after adding tables, columns, or indexes |
| `seed-fixtures.ts` | Local dev without a real Plaid sandbox; resetting to known test data |
| `test-sync.ts` | Debugging a live Plaid integration; verifying cron auth works end-to-end |

---

## TypeScript Config

Scripts use `tsconfig.scripts.json` (a separate config) rather than the root `tsconfig.json`. This is because the root config targets the Next.js runtime (ESNext modules, JSX support) while `ts-node` needs CommonJS module resolution to run scripts directly. The scripts config overrides `module` and `moduleResolution` for this purpose.
