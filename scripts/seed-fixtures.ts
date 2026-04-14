/**
 * Seeds the database with fixture data for two credit card accounts.
 * Uses pg.Pool so it works with both local Postgres and Neon.
 * Safe to run multiple times — all inserts use ON CONFLICT DO UPDATE.
 *
 * Usage:
 *   DATABASE_URL=<connection_string> npx ts-node --project tsconfig.scripts.json scripts/seed-fixtures.ts
 */
import { Pool } from 'pg'
import { FIXTURE_ACCOUNTS, FIXTURE_TRANSACTIONS } from '../lib/fixtures'

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString: databaseUrl })

  // Fixture plaid_items — placeholder rows so the accounts FK is satisfied.
  const fixtureItems = [
    { id: 'item_chase_001', institution_name: 'Chase' },
    { id: 'item_citi_002', institution_name: 'Citi' },
  ]

  console.log('Seeding plaid_items...')
  for (const item of fixtureItems) {
    await pool.query(
      `INSERT INTO plaid_items (id, access_token, institution_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET institution_name = EXCLUDED.institution_name`,
      [item.id, `fixture_token_${item.id}`, item.institution_name],
    )
  }

  console.log('Seeding accounts...')
  for (const a of FIXTURE_ACCOUNTS) {
    await pool.query(
      `INSERT INTO accounts (
         id, item_id, name, official_name, type, subtype,
         current_balance, available_credit, credit_limit, currency_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         name             = EXCLUDED.name,
         current_balance  = EXCLUDED.current_balance,
         available_credit = EXCLUDED.available_credit,
         credit_limit     = EXCLUDED.credit_limit`,
      [
        a.id, a.item_id, a.name, a.official_name, a.type, a.subtype,
        a.current_balance, a.available_credit, a.credit_limit, a.currency_code,
      ],
    )
  }

  console.log('Seeding transactions...')
  for (const t of FIXTURE_TRANSACTIONS) {
    await pool.query(
      `INSERT INTO transactions (
         id, account_id, amount, currency_code, name, merchant_name,
         category_primary, category_detail, date, authorized_date, pending
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         amount           = EXCLUDED.amount,
         pending          = EXCLUDED.pending,
         merchant_name    = EXCLUDED.merchant_name,
         category_primary = EXCLUDED.category_primary,
         updated_at       = NOW()`,
      [
        t.id, t.account_id, t.amount, t.currency_code, t.name,
        t.merchant_name, t.category_primary, t.category_detail,
        t.date, t.authorized_date, t.pending,
      ],
    )
  }

  console.log(
    `Seed complete: ${fixtureItems.length} items, ` +
    `${FIXTURE_ACCOUNTS.length} accounts, ` +
    `${FIXTURE_TRANSACTIONS.length} transactions.`,
  )

  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
