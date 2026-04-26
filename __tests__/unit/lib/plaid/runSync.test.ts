/**
 * @jest-environment node
 */
import {
  runSync,
  buildLastSyncInfo,
} from '@/lib/plaid/runSync'
import {
  getAllPlaidItems,
  upsertAccount,
  upsertTransactions,
  deleteTransactions,
  updatePlaidItemCursor,
  countTodaySyncs,
  getLastSyncInfo,
  logSync,
} from '@/lib/db/queries'
import { fetchBalances, fetchTransactions } from '@/lib/plaid/sync'
import type { Account, Transaction } from '@/types'

jest.mock('@/lib/db/queries')
jest.mock('@/lib/plaid/sync')

const mockGetAllPlaidItems = jest.mocked(getAllPlaidItems)
const mockCountTodaySyncs = jest.mocked(countTodaySyncs)
const mockGetLastSyncInfo = jest.mocked(getLastSyncInfo)
const mockFetchBalances = jest.mocked(fetchBalances)
const mockFetchTransactions = jest.mocked(fetchTransactions)
const mockUpsertAccount = jest.mocked(upsertAccount)
const mockUpsertTransactions = jest.mocked(upsertTransactions)
const mockDeleteTransactions = jest.mocked(deleteTransactions)
const mockUpdatePlaidItemCursor = jest.mocked(updatePlaidItemCursor)
const mockLogSync = jest.mocked(logSync)

const ITEM_A = {
  id: 'item_a',
  access_token: 'access-a',
  transactions_cursor: 'cursor_a',
  last_synced_at: new Date('2025-01-01T12:00:00Z'),
}

const ITEM_NEW = {
  id: 'item_new',
  access_token: 'access-new',
  transactions_cursor: null,
  last_synced_at: null,
}

const ACCOUNT_A: Account = {
  id: 'acct_a',
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
  id: 'txn_a',
  account_id: 'acct_a',
  amount: 42,
  currency_code: 'USD',
  name: 'Starbucks',
  merchant_name: 'Starbucks',
  category_primary: 'FOOD_AND_DRINK',
  category_detail: null,
  date: '2025-01-15',
  authorized_date: null,
  pending: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEFAULT_FETCH_RESULT = {
  added: [TXN_A],
  modified: [],
  removed: [],
  nextCursor: 'cursor_a_next',
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.MAX_DAILY_SYNCS
  delete process.env.SYNC_COOLDOWN_MINUTES

  // Happy-path defaults
  mockGetAllPlaidItems.mockResolvedValue([ITEM_A])
  mockCountTodaySyncs.mockResolvedValue(0)
  mockGetLastSyncInfo.mockResolvedValue(null)
  mockFetchBalances.mockResolvedValue([ACCOUNT_A])
  mockFetchTransactions.mockResolvedValue(DEFAULT_FETCH_RESULT)
  mockUpsertAccount.mockResolvedValue(undefined)
  mockUpsertTransactions.mockResolvedValue(undefined)
  mockDeleteTransactions.mockResolvedValue(undefined)
  mockUpdatePlaidItemCursor.mockResolvedValue(undefined)
  mockLogSync.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// buildLastSyncInfo (exported pure function)
// ---------------------------------------------------------------------------

describe('buildLastSyncInfo', () => {
  it('returns null when passed null', () => {
    expect(buildLastSyncInfo(null)).toBeNull()
  })

  it('calculates positive cooldownRemainingMs for a recent sync', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000)
    process.env.SYNC_COOLDOWN_MINUTES = '30'
    const result = buildLastSyncInfo({ synced_at: tenMinutesAgo, triggered_by: 'cron' })
    expect(result).not.toBeNull()
    // Should be approx 20 min remaining (allow ±5s tolerance)
    expect(result!.cooldownRemainingMs).toBeGreaterThan(19 * 60_000)
    expect(result!.cooldownRemainingMs).toBeLessThan(21 * 60_000)
    expect(result!.by).toBe('cron')
  })

  it('clamps cooldownRemainingMs to 0 for an expired cooldown', () => {
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60_000)
    process.env.SYNC_COOLDOWN_MINUTES = '30'
    const result = buildLastSyncInfo({ synced_at: fortyFiveMinutesAgo, triggered_by: null })
    expect(result!.cooldownRemainingMs).toBe(0)
    expect(result!.by).toBeNull()
  })

  it('includes synced_at as an ISO string', () => {
    const date = new Date('2025-06-01T10:00:00Z')
    const result = buildLastSyncInfo({ synced_at: date, triggered_by: null })
    expect(result!.at).toBe('2025-06-01T10:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// runSync
// ---------------------------------------------------------------------------

describe('runSync', () => {
  it('returns cap_reached without calling Plaid when daily cap is hit', async () => {
    process.env.MAX_DAILY_SYNCS = '5'
    mockCountTodaySyncs.mockResolvedValue(5)
    mockGetAllPlaidItems.mockResolvedValue([ITEM_A]) // no new items

    const result = await runSync('test')

    expect(result).toEqual({
      synced: false,
      reason: 'cap_reached',
      itemsProcessed: 0,
      accountsUpdated: 0,
      transactionsAdded: 0,
    })
    expect(mockFetchBalances).not.toHaveBeenCalled()
    expect(mockFetchTransactions).not.toHaveBeenCalled()
  })

  it('returns cooldown when last sync was within the cooldown window', async () => {
    process.env.SYNC_COOLDOWN_MINUTES = '30'
    mockCountTodaySyncs.mockResolvedValue(0)
    mockGetLastSyncInfo.mockResolvedValue({
      synced_at: new Date(Date.now() - 10 * 60_000), // 10 min ago
      triggered_by: 'cron',
    })

    const result = await runSync('test')

    expect(result).toEqual({
      synced: false,
      reason: 'cooldown',
      itemsProcessed: 0,
      accountsUpdated: 0,
      transactionsAdded: 0,
    })
    expect(mockFetchBalances).not.toHaveBeenCalled()
  })

  it('proceeds when cooldown has expired', async () => {
    process.env.SYNC_COOLDOWN_MINUTES = '30'
    mockCountTodaySyncs.mockResolvedValue(0)
    mockGetLastSyncInfo.mockResolvedValue({
      synced_at: new Date(Date.now() - 45 * 60_000), // 45 min ago
      triggered_by: 'cron',
    })

    const result = await runSync('test')

    expect(result.synced).toBe(true)
    expect(mockFetchBalances).toHaveBeenCalled()
  })

  it('bypasses cap and cooldown when an item has never been synced', async () => {
    process.env.MAX_DAILY_SYNCS = '5'
    process.env.SYNC_COOLDOWN_MINUTES = '30'
    mockGetAllPlaidItems.mockResolvedValue([ITEM_NEW]) // last_synced_at: null

    const result = await runSync('test')

    expect(result.synced).toBe(true)
    // cap/cooldown checks should not have been called
    expect(mockCountTodaySyncs).not.toHaveBeenCalled()
    expect(mockGetLastSyncInfo).not.toHaveBeenCalled()
  })

  it('returns synced:true with zero counts when there are no items', async () => {
    mockGetAllPlaidItems.mockResolvedValue([])

    const result = await runSync('test')

    expect(result).toEqual({
      synced: true,
      itemsProcessed: 0,
      accountsUpdated: 0,
      transactionsAdded: 0,
    })
    expect(mockFetchBalances).not.toHaveBeenCalled()
  })

  it('happy path: upserts accounts and transactions, updates cursor, logs sync', async () => {
    const ITEM_B = { ...ITEM_A, id: 'item_b', access_token: 'access-b' }
    const ACCOUNT_B: Account = { ...ACCOUNT_A, id: 'acct_b', item_id: '' }
    const TXN_B: Transaction = { ...TXN_A, id: 'txn_b', account_id: 'acct_b' }

    mockGetAllPlaidItems.mockResolvedValue([ITEM_A, ITEM_B])
    mockFetchBalances
      .mockResolvedValueOnce([ACCOUNT_A])
      .mockResolvedValueOnce([ACCOUNT_B])
    mockFetchTransactions
      .mockResolvedValueOnce({ added: [TXN_A], modified: [], removed: [], nextCursor: 'c1' })
      .mockResolvedValueOnce({ added: [TXN_B], modified: [], removed: [], nextCursor: 'c2' })

    const result = await runSync('manual')

    expect(result.synced).toBe(true)
    expect(result.itemsProcessed).toBe(2)
    expect(result.accountsUpdated).toBe(2)

    expect(mockUpsertAccount).toHaveBeenCalledTimes(2)
    expect(mockUpsertAccount).toHaveBeenCalledWith({ ...ACCOUNT_A, item_id: ITEM_A.id })
    expect(mockUpsertAccount).toHaveBeenCalledWith({ ...ACCOUNT_B, item_id: ITEM_B.id })

    expect(mockUpsertTransactions).toHaveBeenCalledWith([TXN_A])
    expect(mockUpsertTransactions).toHaveBeenCalledWith([TXN_B])

    expect(mockUpdatePlaidItemCursor).toHaveBeenCalledWith(ITEM_A.id, 'c1')
    expect(mockUpdatePlaidItemCursor).toHaveBeenCalledWith(ITEM_B.id, 'c2')

    expect(mockLogSync).toHaveBeenCalledWith('manual')
  })

  it('filters transactions whose account_id is not in the fetched accounts set', async () => {
    const TXN_UNKNOWN: Transaction = { ...TXN_A, id: 'txn_x', account_id: 'acct_unknown' }
    mockFetchTransactions.mockResolvedValue({
      added: [TXN_A, TXN_UNKNOWN],
      modified: [],
      removed: [],
      nextCursor: 'c1',
    })

    await runSync('test')

    // Only TXN_A (which belongs to acct_a, which IS in the fetched accounts) should be upserted
    expect(mockUpsertTransactions).toHaveBeenCalledWith([TXN_A])
    expect(mockUpsertTransactions).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'txn_x' })]),
    )
  })

  it('calls deleteTransactions with removed transaction IDs', async () => {
    mockFetchTransactions.mockResolvedValue({
      added: [],
      modified: [],
      removed: ['txn_old_1', 'txn_old_2'],
      nextCursor: 'c1',
    })

    await runSync('test')

    expect(mockDeleteTransactions).toHaveBeenCalledWith(['txn_old_1', 'txn_old_2'])
  })

  it('respects MAX_DAILY_SYNCS env override', async () => {
    process.env.MAX_DAILY_SYNCS = '2'
    mockCountTodaySyncs.mockResolvedValue(2)

    const result = await runSync('test')
    expect(result.reason).toBe('cap_reached')
  })
})
