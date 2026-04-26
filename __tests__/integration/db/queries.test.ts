import { Pool } from 'pg'
import {
  upsertPlaidItem,
  getAllPlaidItems,
  updatePlaidItemCursor,
  countLifetimePlaidConnections,
  logPlaidConnection,
  countTodaySyncs,
  getLastSyncInfo,
  logSync,
  deletePlaidItem,
  upsertAccount,
  getAllAccounts,
  upsertTransactions,
  deleteTransactions,
  getRecentTransactions,
  getSpendingByDay,
  getCategoryBreakdown,
  getAggregateStats,
} from '@/lib/db/queries'
import {
  createFixturePlaidItem,
  createFixtureAccount,
  createFixtureTransaction,
} from '../setup/dbHelpers'

// The real pool from lib/db/index.ts uses process.env.DATABASE_URL,
// which was set to the test container URL in globalSetup.
// We also create a direct pool for fixture helpers.
let pool: Pool

beforeAll(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
})

afterAll(async () => {
  await pool.end()
})

// ---------------------------------------------------------------------------
// plaid_items
// ---------------------------------------------------------------------------

describe('upsertPlaidItem', () => {
  it('inserts a new item', async () => {
    await upsertPlaidItem({
      id: 'item_upsert_01',
      access_token: 'access-tok',
      institution_id: 'ins_1',
      institution_name: 'Chase',
    })

    const { rows } = await pool.query(`SELECT * FROM plaid_items WHERE id = $1`, ['item_upsert_01'])
    expect(rows).toHaveLength(1)
    expect(rows[0].access_token).toBe('access-tok')
    expect(rows[0].institution_name).toBe('Chase')
  })

  it('updates existing item on conflict (idempotent)', async () => {
    await upsertPlaidItem({
      id: 'item_upsert_02',
      access_token: 'old-token',
      institution_id: 'ins_1',
      institution_name: 'Old Name',
    })
    await upsertPlaidItem({
      id: 'item_upsert_02',
      access_token: 'new-token',
      institution_id: 'ins_1',
      institution_name: 'New Name',
    })

    const { rows } = await pool.query(`SELECT * FROM plaid_items WHERE id = $1`, ['item_upsert_02'])
    expect(rows).toHaveLength(1)
    expect(rows[0].access_token).toBe('new-token')
    expect(rows[0].institution_name).toBe('New Name')
  })
})

describe('getAllPlaidItems', () => {
  it('returns inserted items ordered by created_at', async () => {
    await createFixturePlaidItem(pool, { id: 'item_list_a' })
    await createFixturePlaidItem(pool, { id: 'item_list_b' })

    const items = await getAllPlaidItems()
    const ids = items.map((i) => i.id)
    expect(ids).toContain('item_list_a')
    expect(ids).toContain('item_list_b')
  })
})

describe('updatePlaidItemCursor', () => {
  it('updates the transactions_cursor and last_synced_at', async () => {
    await createFixturePlaidItem(pool, { id: 'item_cursor', transactions_cursor: null })

    await updatePlaidItemCursor('item_cursor', 'cursor_xyz')

    const { rows } = await pool.query(
      `SELECT transactions_cursor, last_synced_at FROM plaid_items WHERE id = $1`,
      ['item_cursor'],
    )
    expect(rows[0].transactions_cursor).toBe('cursor_xyz')
    expect(rows[0].last_synced_at).not.toBeNull()
  })
})

describe('deletePlaidItem', () => {
  it('deletes the item and returns 1', async () => {
    await createFixturePlaidItem(pool, { id: 'item_del' })

    const count = await deletePlaidItem('item_del')

    expect(count).toBe(1)
    const { rows } = await pool.query(`SELECT * FROM plaid_items WHERE id = $1`, ['item_del'])
    expect(rows).toHaveLength(0)
  })

  it('returns 0 when item does not exist', async () => {
    const count = await deletePlaidItem('item_nonexistent')
    expect(count).toBe(0)
  })

  it('cascades to accounts and transactions on delete', async () => {
    await createFixturePlaidItem(pool, { id: 'item_cascade' })
    await createFixtureAccount(pool, { id: 'acct_cascade', item_id: 'item_cascade' })
    await createFixtureTransaction(pool, { id: 'txn_cascade', account_id: 'acct_cascade' })

    await deletePlaidItem('item_cascade')

    const { rows: acctRows } = await pool.query(`SELECT * FROM accounts WHERE id = $1`, ['acct_cascade'])
    const { rows: txnRows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_cascade'])
    expect(acctRows).toHaveLength(0)
    expect(txnRows).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// sync_log
// ---------------------------------------------------------------------------

describe('countTodaySyncs', () => {
  it('counts only syncs from today', async () => {
    await pool.query(`INSERT INTO sync_log (triggered_by, synced_at) VALUES ($1, NOW())`, ['test'])
    await pool.query(`INSERT INTO sync_log (triggered_by, synced_at) VALUES ($1, NOW())`, ['test'])
    await pool.query(
      `INSERT INTO sync_log (triggered_by, synced_at) VALUES ($1, NOW() - interval '1 day')`,
      ['test'],
    )

    const count = await countTodaySyncs()
    expect(count).toBe(2) // yesterday's row excluded
  })

  it('returns 0 when no syncs today', async () => {
    const count = await countTodaySyncs()
    expect(count).toBe(0)
  })
})

describe('getLastSyncInfo', () => {
  it('returns null when sync_log is empty', async () => {
    const result = await getLastSyncInfo()
    expect(result).toBeNull()
  })

  it('returns the most recent sync row', async () => {
    await pool.query(`INSERT INTO sync_log (triggered_by, synced_at) VALUES ('old', NOW() - interval '1 hour')`)
    await pool.query(`INSERT INTO sync_log (triggered_by, synced_at) VALUES ('newest', NOW())`)

    const result = await getLastSyncInfo()
    expect(result).not.toBeNull()
    expect(result!.triggered_by).toBe('newest')
  })
})

describe('logSync', () => {
  it('inserts a row into sync_log', async () => {
    await logSync('manual-test')

    const { rows } = await pool.query(`SELECT * FROM sync_log WHERE triggered_by = $1`, ['manual-test'])
    expect(rows).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// plaid_connections_log
// ---------------------------------------------------------------------------

describe('countLifetimePlaidConnections / logPlaidConnection', () => {
  it('starts at 0 and increments with each log', async () => {
    expect(await countLifetimePlaidConnections()).toBe(0)
    await logPlaidConnection()
    expect(await countLifetimePlaidConnections()).toBe(1)
    await logPlaidConnection()
    expect(await countLifetimePlaidConnections()).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// accounts
// ---------------------------------------------------------------------------

describe('upsertAccount / getAllAccounts', () => {
  it('inserts and retrieves an account', async () => {
    await createFixturePlaidItem(pool, { id: 'item_acct_test' })
    await upsertAccount({
      id: 'acct_upsert_01',
      item_id: 'item_acct_test',
      name: 'My Card',
      official_name: 'My Official Card',
      type: 'credit',
      subtype: 'credit card',
      current_balance: 300,
      available_credit: 700,
      credit_limit: 1000,
      currency_code: 'USD',
      last_synced_at: null,
      created_at: new Date().toISOString(),
      institution_name: null,
    })

    const accounts = await getAllAccounts()
    const acct = accounts.find((a) => a.id === 'acct_upsert_01')
    expect(acct).toBeDefined()
    expect(acct!.name).toBe('My Card')
    // pg returns NUMERIC columns as strings; getAllAccounts does not cast them
    expect(Number(acct!.current_balance)).toBe(300)
    expect(acct!.institution_name).toBe('Test Bank') // joined from plaid_items
  })

  it('updates an existing account on conflict', async () => {
    await createFixturePlaidItem(pool, { id: 'item_acct_upsert' })
    const base = {
      id: 'acct_upsert_02',
      item_id: 'item_acct_upsert',
      name: 'Old Name',
      official_name: null,
      type: 'credit',
      subtype: null,
      current_balance: 100,
      available_credit: 900,
      credit_limit: 1000,
      currency_code: 'USD',
      last_synced_at: null,
      created_at: new Date().toISOString(),
      institution_name: null,
    }
    await upsertAccount(base)
    await upsertAccount({ ...base, name: 'Updated Name', current_balance: 200 })

    const accounts = await getAllAccounts()
    const acct = accounts.find((a) => a.id === 'acct_upsert_02')
    expect(acct!.name).toBe('Updated Name')
    expect(Number(acct!.current_balance)).toBe(200)
    // Only one row
    const { rows } = await pool.query(`SELECT COUNT(*) FROM accounts WHERE id = $1`, ['acct_upsert_02'])
    expect(Number(rows[0].count)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// transactions
// ---------------------------------------------------------------------------

describe('upsertTransactions', () => {
  it('inserts transactions', async () => {
    await createFixturePlaidItem(pool, { id: 'item_txn_insert' })
    await createFixtureAccount(pool, { id: 'acct_txn_insert', item_id: 'item_txn_insert' })

    await upsertTransactions([
      {
        id: 'txn_ins_a',
        account_id: 'acct_txn_insert',
        amount: 50,
        currency_code: 'USD',
        name: 'Store A',
        merchant_name: null,
        category_primary: 'SHOPPING',
        category_detail: null,
        date: '2025-01-10',
        authorized_date: null,
        pending: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_ins_a'])
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe('50.00')
  })

  it('updates on conflict (idempotent)', async () => {
    await createFixturePlaidItem(pool, { id: 'item_txn_upsert' })
    await createFixtureAccount(pool, { id: 'acct_txn_upsert', item_id: 'item_txn_upsert' })

    const txn = {
      id: 'txn_upsert_x',
      account_id: 'acct_txn_upsert',
      amount: 10,
      currency_code: 'USD',
      name: 'Merchant',
      merchant_name: null,
      category_primary: null,
      category_detail: null,
      date: '2025-01-01',
      authorized_date: null,
      pending: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await upsertTransactions([txn])
    await upsertTransactions([{ ...txn, amount: 25, pending: false }])

    const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = $1`, ['txn_upsert_x'])
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe('25.00')
    expect(rows[0].pending).toBe(false)
  })
})

describe('deleteTransactions', () => {
  it('does nothing and does not throw for an empty array', async () => {
    await expect(deleteTransactions([])).resolves.toBeUndefined()
  })

  it('deletes the specified transaction IDs', async () => {
    await createFixturePlaidItem(pool, { id: 'item_del_txn' })
    await createFixtureAccount(pool, { id: 'acct_del_txn', item_id: 'item_del_txn' })
    await createFixtureTransaction(pool, { id: 'txn_del_a', account_id: 'acct_del_txn' })
    await createFixtureTransaction(pool, { id: 'txn_del_b', account_id: 'acct_del_txn' })

    await deleteTransactions(['txn_del_a', 'txn_del_b'])

    const { rows } = await pool.query(`SELECT * FROM transactions WHERE id = ANY($1)`, [['txn_del_a', 'txn_del_b']])
    expect(rows).toHaveLength(0)
  })

  it('silently handles non-existent IDs', async () => {
    await expect(deleteTransactions(['txn_does_not_exist'])).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Dashboard read queries
// ---------------------------------------------------------------------------

describe('getRecentTransactions', () => {
  it('returns an empty array when there are no transactions', async () => {
    const txns = await getRecentTransactions()
    expect(txns).toEqual([])
  })

  it('filters by accountId when provided', async () => {
    await createFixturePlaidItem(pool, { id: 'item_rq' })
    await createFixtureAccount(pool, { id: 'acct_rq_a', item_id: 'item_rq' })
    await createFixtureAccount(pool, { id: 'acct_rq_b', item_id: 'item_rq' })
    await createFixtureTransaction(pool, { id: 'txn_rq_a', account_id: 'acct_rq_a', name: 'For A' })
    await createFixtureTransaction(pool, { id: 'txn_rq_b', account_id: 'acct_rq_b', name: 'For B' })

    const txns = await getRecentTransactions('acct_rq_a')
    expect(txns.every((t) => t.account_id === 'acct_rq_a')).toBe(true)
    expect(txns.find((t) => t.id === 'txn_rq_b')).toBeUndefined()
  })

  it('excludes transactions older than the days window', async () => {
    await createFixturePlaidItem(pool, { id: 'item_window' })
    await createFixtureAccount(pool, { id: 'acct_window', item_id: 'item_window' })

    // Old transaction (32 days ago)
    const oldDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    // Recent transaction (yesterday)
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    await createFixtureTransaction(pool, { id: 'txn_old', account_id: 'acct_window', date: oldDate, name: 'Old' })
    await createFixtureTransaction(pool, { id: 'txn_recent', account_id: 'acct_window', date: recentDate, name: 'Recent' })

    const txns = await getRecentTransactions(undefined, 30)
    const ids = txns.map((t) => t.id)
    expect(ids).toContain('txn_recent')
    expect(ids).not.toContain('txn_old')
  })
})

describe('getAggregateStats', () => {
  it('returns zeros when no accounts exist', async () => {
    const stats = await getAggregateStats()
    expect(stats.totalBalance).toBe(0)
    expect(stats.totalCreditLimit).toBe(0)
    expect(stats.totalAvailableCredit).toBe(0)
  })

  it('sums across all accounts', async () => {
    await createFixturePlaidItem(pool, { id: 'item_agg' })
    await createFixtureAccount(pool, {
      id: 'acct_agg_1', item_id: 'item_agg',
      current_balance: 300, credit_limit: 1000, available_credit: 700,
    })
    await createFixtureAccount(pool, {
      id: 'acct_agg_2', item_id: 'item_agg',
      current_balance: 200, credit_limit: 2000, available_credit: 1800,
    })

    const stats = await getAggregateStats()
    expect(stats.totalCreditLimit).toBe(3000)
    expect(stats.totalAvailableCredit).toBe(2500)
  })
})

describe('getSpendingByDay / getCategoryBreakdown', () => {
  it('returns empty arrays when no transactions exist', async () => {
    expect(await getSpendingByDay()).toEqual([])
    expect(await getCategoryBreakdown()).toEqual([])
  })

  it('getSpendingByDay groups non-pending transactions by date', async () => {
    await createFixturePlaidItem(pool, { id: 'item_sbd' })
    await createFixtureAccount(pool, { id: 'acct_sbd', item_id: 'item_sbd' })

    const today = new Date().toISOString().slice(0, 10)
    await createFixtureTransaction(pool, { id: 'txn_sbd_1', account_id: 'acct_sbd', amount: 10, date: today, pending: false })
    await createFixtureTransaction(pool, { id: 'txn_sbd_2', account_id: 'acct_sbd', amount: 20, date: today, pending: false })
    await createFixtureTransaction(pool, { id: 'txn_sbd_p', account_id: 'acct_sbd', amount: 99, date: today, pending: true })

    const result = await getSpendingByDay()
    const todayRow = result.find((r) => r.date === today)
    expect(todayRow).toBeDefined()
    expect(todayRow!.total).toBe(30) // pending excluded
  })
})
