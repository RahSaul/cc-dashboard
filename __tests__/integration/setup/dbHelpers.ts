import { Pool } from 'pg'

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

export async function createFixturePlaidItem(
  pool: Pool,
  overrides: {
    id?: string
    access_token?: string
    institution_id?: string | null
    institution_name?: string | null
    transactions_cursor?: string | null
    last_synced_at?: string | null
  } = {},
) {
  const id = overrides.id ?? 'item_test_001'
  const access_token = overrides.access_token ?? 'access-sandbox-test'
  const institution_id = overrides.institution_id ?? 'ins_1'
  const institution_name = overrides.institution_name ?? 'Test Bank'
  const transactions_cursor = overrides.transactions_cursor ?? null
  const last_synced_at = overrides.last_synced_at ?? null

  await pool.query(
    `INSERT INTO plaid_items
       (id, access_token, institution_id, institution_name, transactions_cursor, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, access_token, institution_id, institution_name, transactions_cursor, last_synced_at],
  )
  return { id, access_token, institution_id, institution_name, transactions_cursor, last_synced_at }
}

export async function createFixtureAccount(
  pool: Pool,
  overrides: {
    id?: string
    item_id?: string
    name?: string
    official_name?: string | null
    type?: string
    subtype?: string | null
    current_balance?: number | null
    available_credit?: number | null
    credit_limit?: number | null
    currency_code?: string
  } = {},
) {
  const id = overrides.id ?? 'acct_test_001'
  const item_id = overrides.item_id ?? 'item_test_001'
  const name = overrides.name ?? 'Test Credit Card'
  const official_name = overrides.official_name ?? null
  const type = overrides.type ?? 'credit'
  const subtype = overrides.subtype ?? 'credit card'
  const current_balance = overrides.current_balance ?? 500.0
  const available_credit = overrides.available_credit ?? 4500.0
  const credit_limit = overrides.credit_limit ?? 5000.0
  const currency_code = overrides.currency_code ?? 'USD'

  await pool.query(
    `INSERT INTO accounts
       (id, item_id, name, official_name, type, subtype,
        current_balance, available_credit, credit_limit, currency_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, item_id, name, official_name, type, subtype,
     current_balance, available_credit, credit_limit, currency_code],
  )
  return { id, item_id, name, type, current_balance, available_credit, credit_limit, currency_code }
}

export async function createFixtureTransaction(
  pool: Pool,
  overrides: {
    id?: string
    account_id?: string
    amount?: number
    currency_code?: string
    name?: string
    merchant_name?: string | null
    category_primary?: string | null
    category_detail?: string | null
    date?: string
    authorized_date?: string | null
    pending?: boolean
  } = {},
) {
  const id = overrides.id ?? 'txn_test_001'
  const account_id = overrides.account_id ?? 'acct_test_001'
  const amount = overrides.amount ?? 42.0
  const currency_code = overrides.currency_code ?? 'USD'
  const name = overrides.name ?? 'Test Merchant'
  const merchant_name = overrides.merchant_name ?? 'Test Merchant'
  const category_primary = overrides.category_primary ?? 'FOOD_AND_DRINK'
  const category_detail = overrides.category_detail ?? null
  const date = overrides.date ?? new Date().toISOString().slice(0, 10)
  const authorized_date = overrides.authorized_date ?? null
  const pending = overrides.pending ?? false

  await pool.query(
    `INSERT INTO transactions
       (id, account_id, amount, currency_code, name, merchant_name,
        category_primary, category_detail, date, authorized_date, pending)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, account_id, amount, currency_code, name, merchant_name,
     category_primary, category_detail, date, authorized_date, pending],
  )
  return { id, account_id, amount, currency_code, name, merchant_name, date, pending }
}
