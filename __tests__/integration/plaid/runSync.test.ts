import { Pool } from 'pg'
import { runSync } from '@/lib/plaid/runSync'
import { fetchBalances, fetchTransactions } from '@/lib/plaid/sync'
import { createFixturePlaidItem } from '../setup/dbHelpers'
import type { Account, Transaction } from '@/types'

jest.mock('@/lib/plaid/sync')

const mockFetchBalances = jest.mocked(fetchBalances)
const mockFetchTransactions = jest.mocked(fetchTransactions)

let pool: Pool

const ACCOUNT_A: Account = {
  id: 'acct_int_a',
  item_id: '',
  name: 'Chase Sapphire',
  official_name: null,
  type: 'credit',
  subtype: 'credit card',
  current_balance: 500,
  available_credit: 4500,
  credit_limit: 5000,
  currency_code: 'USD',
  last_synced_at: null,
  created_at: new Date().toISOString(),
  institution_name: null,
}

const TXN_A: Transaction = {
  id: 'txn_int_a',
  account_id: 'acct_int_a',
  amount: 42,
  currency_code: 'USD',
  name: 'Starbucks',
  merchant_name: 'Starbucks',
  category_primary: 'FOOD_AND_DRINK',
  category_detail: null,
  date: new Date().toISOString().slice(0, 10),
  authorized_date: null,
  pending: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

beforeAll(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
})

afterAll(async () => {
  await pool.end()
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('runSync integration (real DB, mocked Plaid)', () => {
  it('syncs a new item: upserts accounts and transactions, sets cursor, logs sync', async () => {
    // new item — last_synced_at: null → bypasses cap/cooldown
    await createFixturePlaidItem(pool, {
      id: 'item_int_new',
      last_synced_at: null,
      transactions_cursor: null,
    })

    mockFetchBalances.mockResolvedValue([ACCOUNT_A])
    mockFetchTransactions.mockResolvedValue({
      added: [TXN_A],
      modified: [],
      removed: [],
      nextCursor: 'cursor_after',
    })

    const result = await runSync('test-integration')

    expect(result.synced).toBe(true)
    expect(result.itemsProcessed).toBe(1)
    expect(result.accountsUpdated).toBe(1)

    // Account should be in DB
    const { rows: acctRows } = await pool.query(`SELECT * FROM accounts WHERE id = $1`, ['acct_int_a'])
    expect(acctRows).toHaveLength(1)
    expect(acctRows[0].name).toBe('Chase Sapphire')

    // Transaction should be in DB
    const { rows: txnRows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_int_a'])
    expect(txnRows).toHaveLength(1)

    // Cursor should be updated
    const { rows: itemRows } = await pool.query(
      `SELECT transactions_cursor FROM plaid_items WHERE id = $1`,
      ['item_int_new'],
    )
    expect(itemRows[0].transactions_cursor).toBe('cursor_after')

    // sync_log should have one row
    const { rows: logRows } = await pool.query(`SELECT * FROM sync_log WHERE triggered_by = $1`, ['test-integration'])
    expect(logRows).toHaveLength(1)
  })

  it('returns cooldown when called again too soon after a sync', async () => {
    await createFixturePlaidItem(pool, {
      id: 'item_int_cooldown',
      last_synced_at: new Date().toISOString(), // already synced just now
    })
    // Insert a recent sync log row to trigger cooldown
    await pool.query(`INSERT INTO sync_log (triggered_by, synced_at) VALUES ('prior', NOW())`)

    process.env.SYNC_COOLDOWN_MINUTES = '30'
    const result = await runSync('second-call')
    delete process.env.SYNC_COOLDOWN_MINUTES

    expect(result.synced).toBe(false)
    expect(result.reason).toBe('cooldown')
    expect(mockFetchBalances).not.toHaveBeenCalled()
  })

  it('returns cap_reached when daily sync count is at the limit', async () => {
    await createFixturePlaidItem(pool, {
      id: 'item_int_cap',
      last_synced_at: new Date().toISOString(), // already synced
    })

    // Insert MAX_DAILY_SYNCS rows for today
    process.env.MAX_DAILY_SYNCS = '3'
    await pool.query(`INSERT INTO sync_log (triggered_by) VALUES ('a'), ('b'), ('c')`)

    const result = await runSync('over-cap')
    delete process.env.MAX_DAILY_SYNCS

    expect(result.synced).toBe(false)
    expect(result.reason).toBe('cap_reached')
  })

  it('deletes removed transaction IDs from the database', async () => {
    await createFixturePlaidItem(pool, { id: 'item_int_remove', last_synced_at: null })

    // Pre-insert a transaction that will be "removed" by Plaid
    await pool.query(
      `INSERT INTO accounts (id, item_id, name, type, currency_code) VALUES ($1,$2,$3,$4,$5)`,
      ['acct_int_remove', 'item_int_remove', 'Test', 'credit', 'USD'],
    )
    await pool.query(
      `INSERT INTO transactions (id, account_id, amount, name, date) VALUES ($1,$2,$3,$4,$5)`,
      ['txn_to_remove', 'acct_int_remove', 10, 'Old Txn', new Date().toISOString().slice(0, 10)],
    )

    mockFetchBalances.mockResolvedValue([{ ...ACCOUNT_A, id: 'acct_int_remove', item_id: '' }])
    mockFetchTransactions.mockResolvedValue({
      added: [],
      modified: [],
      removed: ['txn_to_remove'],
      nextCursor: 'c1',
    })

    await runSync('remove-test')

    const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_to_remove'])
    expect(rows).toHaveLength(0)
  })

  it('only upserts transactions for accounts that were fetched (account filtering)', async () => {
    await createFixturePlaidItem(pool, { id: 'item_int_filter', last_synced_at: null })

    const txnForUnknownAcct: Transaction = {
      ...TXN_A,
      id: 'txn_unknown_acct',
      account_id: 'acct_unknown_not_in_fetch',
    }

    mockFetchBalances.mockResolvedValue([ACCOUNT_A])
    mockFetchTransactions.mockResolvedValue({
      added: [TXN_A, txnForUnknownAcct],
      modified: [],
      removed: [],
      nextCursor: 'c1',
    })

    await runSync('filter-test')

    // txn_int_a should be in DB (belongs to acct_int_a which IS fetched)
    const { rows: good } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_int_a'])
    expect(good).toHaveLength(1)

    // txn_unknown_acct should NOT be in DB
    const { rows: bad } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_unknown_acct'])
    expect(bad).toHaveLength(0)
  })
})
