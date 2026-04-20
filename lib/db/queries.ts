import { pool } from './index'
import type {
  Account,
  Transaction,
  SpendingByDay,
  CategoryBreakdown,
  AggregateStats,
} from '@/types'

// ---------------------------------------------------------------------------
// Plaid items
// ---------------------------------------------------------------------------

export async function upsertPlaidItem(item: {
  id: string
  access_token: string
  institution_id: string | null
  institution_name: string | null
}): Promise<void> {
  await pool.query(
    `INSERT INTO plaid_items (id, access_token, institution_id, institution_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       access_token     = EXCLUDED.access_token,
       institution_id   = EXCLUDED.institution_id,
       institution_name = EXCLUDED.institution_name`,
    [item.id, item.access_token, item.institution_id, item.institution_name],
  )
}

export async function getAllPlaidItems(): Promise<
  { id: string; access_token: string; transactions_cursor: string | null }[]
> {
  const { rows } = await pool.query(
    `SELECT id, access_token, transactions_cursor
     FROM plaid_items
     ORDER BY created_at ASC`,
  )
  return rows
}

export async function updatePlaidItemCursor(
  itemId: string,
  cursor: string,
): Promise<void> {
  await pool.query(
    `UPDATE plaid_items
     SET transactions_cursor = $1,
         last_synced_at      = NOW()
     WHERE id = $2`,
    [cursor, itemId],
  )
}

export async function countLifetimePlaidConnections(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM plaid_connections_log`,
  )
  return rows[0].count
}

export async function logPlaidConnection(): Promise<void> {
  await pool.query(`INSERT INTO plaid_connections_log DEFAULT VALUES`)
}

export async function countTodaySyncs(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM sync_log
     WHERE synced_at >= date_trunc('day', NOW())`,
  )
  return rows[0].count
}

export async function getLastSyncInfo(): Promise<{
  synced_at: Date
  triggered_by: string | null
} | null> {
  const { rows } = await pool.query(
    `SELECT synced_at, triggered_by
     FROM sync_log
     ORDER BY synced_at DESC
     LIMIT 1`,
  )
  return rows[0] ?? null
}

export async function logSync(triggeredBy: string): Promise<void> {
  await pool.query(
    `INSERT INTO sync_log (triggered_by) VALUES ($1)`,
    [triggeredBy],
  )
}

export async function deletePlaidItem(itemId: string): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM plaid_items WHERE id = $1`,
    [itemId],
  )
  return rowCount ?? 0
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function upsertAccount(account: Account): Promise<void> {
  await pool.query(
    `INSERT INTO accounts (
       id, item_id, name, official_name, type, subtype,
       current_balance, available_credit, credit_limit,
       currency_code, last_synced_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (id) DO UPDATE SET
       name             = EXCLUDED.name,
       official_name    = EXCLUDED.official_name,
       current_balance  = EXCLUDED.current_balance,
       available_credit = EXCLUDED.available_credit,
       credit_limit     = EXCLUDED.credit_limit,
       last_synced_at   = NOW()`,
    [
      account.id, account.item_id, account.name, account.official_name,
      account.type, account.subtype, account.current_balance,
      account.available_credit, account.credit_limit, account.currency_code,
    ],
  )
}

export async function getAllAccounts(): Promise<Account[]> {
  const { rows } = await pool.query(
    `SELECT
       a.id, a.item_id, a.name, a.official_name, a.type, a.subtype,
       a.current_balance, a.available_credit, a.credit_limit, a.currency_code,
       a.last_synced_at::text AS last_synced_at,
       a.created_at::text     AS created_at,
       pi.institution_name
     FROM accounts a
     JOIN plaid_items pi ON pi.id = a.item_id
     ORDER BY a.created_at ASC`,
  )
  return rows as Account[]
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function upsertTransactions(
  transactions: Transaction[],
): Promise<void> {
  for (const t of transactions) {
    await pool.query(
      `INSERT INTO transactions (
         id, account_id, amount, currency_code, name, merchant_name,
         category_primary, category_detail, date, authorized_date,
         pending, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (id) DO UPDATE SET
         amount           = EXCLUDED.amount,
         pending          = EXCLUDED.pending,
         merchant_name    = EXCLUDED.merchant_name,
         category_primary = EXCLUDED.category_primary,
         category_detail  = EXCLUDED.category_detail,
         updated_at       = NOW()`,
      [
        t.id, t.account_id, t.amount, t.currency_code, t.name,
        t.merchant_name, t.category_primary, t.category_detail,
        t.date, t.authorized_date, t.pending,
      ],
    )
  }
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await pool.query(`DELETE FROM transactions WHERE id = ANY($1)`, [ids])
}

// ---------------------------------------------------------------------------
// Dashboard queries (read-only, no Plaid calls)
// ---------------------------------------------------------------------------

export async function getRecentTransactions(
  accountId?: string,
  days = 30,
): Promise<Transaction[]> {
  const { rows } = accountId
    ? await pool.query(
        `SELECT
           id, account_id, amount::float AS amount, currency_code,
           name, merchant_name, category_primary, category_detail,
           date::text AS date, authorized_date::text AS authorized_date,
           pending,
           created_at::text AS created_at,
           updated_at::text AS updated_at
         FROM transactions
         WHERE account_id = $1
           AND date >= NOW() - ($2 || ' days')::interval
         ORDER BY date DESC, created_at DESC
         LIMIT 20`,
        [accountId, days],
      )
    : await pool.query(
        `SELECT
           id, account_id, amount::float AS amount, currency_code,
           name, merchant_name, category_primary, category_detail,
           date::text AS date, authorized_date::text AS authorized_date,
           pending,
           created_at::text AS created_at,
           updated_at::text AS updated_at
         FROM transactions
         WHERE date >= NOW() - ($1 || ' days')::interval
         ORDER BY date DESC, created_at DESC
         LIMIT 20`,
        [days],
      )
  return rows as Transaction[]
}

export async function getSpendingByDay(
  accountId?: string,
  days = 30,
): Promise<SpendingByDay[]> {
  const { rows } = accountId
    ? await pool.query(
        `SELECT
           date::text         AS date,
           SUM(amount)::float AS total
         FROM transactions
         WHERE account_id = $1
           AND date >= NOW() - ($2 || ' days')::interval
           AND pending = FALSE
         GROUP BY date
         ORDER BY date ASC`,
        [accountId, days],
      )
    : await pool.query(
        `SELECT
           date::text         AS date,
           SUM(amount)::float AS total
         FROM transactions
         WHERE date >= NOW() - ($1 || ' days')::interval
           AND pending = FALSE
         GROUP BY date
         ORDER BY date ASC`,
        [days],
      )
  return rows as SpendingByDay[]
}

export async function getCategoryBreakdown(
  accountId?: string,
  days = 30,
): Promise<CategoryBreakdown[]> {
  const { rows } = accountId
    ? await pool.query(
        `SELECT
           COALESCE(category_primary, 'Other') AS category,
           SUM(amount)::float                  AS total
         FROM transactions
         WHERE account_id = $1
           AND date >= NOW() - ($2 || ' days')::interval
           AND pending = FALSE
         GROUP BY category_primary
         ORDER BY total DESC`,
        [accountId, days],
      )
    : await pool.query(
        `SELECT
           COALESCE(category_primary, 'Other') AS category,
           SUM(amount)::float                  AS total
         FROM transactions
         WHERE date >= NOW() - ($1 || ' days')::interval
           AND pending = FALSE
         GROUP BY category_primary
         ORDER BY total DESC`,
        [days],
      )
  return rows as CategoryBreakdown[]
}

export async function getAggregateStats(): Promise<AggregateStats> {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(current_balance), 0)::float  AS "totalBalance",
       COALESCE(SUM(credit_limit), 0)::float     AS "totalCreditLimit",
       COALESCE(SUM(available_credit), 0)::float AS "totalAvailableCredit"
     FROM accounts`,
  )
  return rows[0] as AggregateStats
}
