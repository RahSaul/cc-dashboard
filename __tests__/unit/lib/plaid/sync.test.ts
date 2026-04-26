/**
 * @jest-environment node
 */
import { fetchBalances, fetchTransactions } from '@/lib/plaid/sync'
import { plaidClient } from '@/lib/plaid/client'

jest.mock('@/lib/plaid/client', () => ({
  plaidClient: {
    accountsBalanceGet: jest.fn(),
    transactionsSync: jest.fn(),
  },
}))

const mockBalanceGet = jest.mocked(plaidClient.accountsBalanceGet)
const mockTxnSync = jest.mocked(plaidClient.transactionsSync)

// Minimal Plaid account shape
function makePlaidAccount(overrides: {
  account_id?: string
  type?: string
  name?: string
  official_name?: string | null
  subtype?: string | null
  balances?: {
    current?: number | null
    available?: number | null
    limit?: number | null
    iso_currency_code?: string | null
  }
} = {}) {
  // Use explicit undefined check (not ??) so callers can pass explicit null
  const b = overrides.balances
  return {
    account_id: overrides.account_id ?? 'acct_plaid_001',
    type: overrides.type ?? 'credit',
    name: overrides.name ?? 'Test Card',
    official_name: overrides.official_name ?? null,
    subtype: overrides.subtype ?? 'credit card',
    balances: {
      current: b !== undefined && 'current' in b ? b.current : 200,
      available: b !== undefined && 'available' in b ? b.available : 800,
      limit: b !== undefined && 'limit' in b ? b.limit : 1000,
      iso_currency_code: b !== undefined && 'iso_currency_code' in b ? b.iso_currency_code : 'USD',
    },
  }
}

// Minimal Plaid transaction shape
function makePlaidTxn(overrides: {
  transaction_id?: string
  account_id?: string
  amount?: number
  name?: string
  merchant_name?: string | null
  iso_currency_code?: string | null
  personal_finance_category?: { primary?: string; detailed?: string } | null
  date?: string
  authorized_date?: string | null
  pending?: boolean
} = {}) {
  return {
    transaction_id: overrides.transaction_id ?? 'txn_001',
    account_id: overrides.account_id ?? 'acct_plaid_001',
    amount: overrides.amount ?? 50,
    name: overrides.name ?? 'Test Store',
    merchant_name: overrides.merchant_name ?? null,
    iso_currency_code: overrides.iso_currency_code ?? 'USD',
    personal_finance_category: overrides.personal_finance_category ?? null,
    date: overrides.date ?? '2025-01-01',
    authorized_date: overrides.authorized_date ?? null,
    pending: overrides.pending ?? false,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// fetchBalances
// ---------------------------------------------------------------------------

describe('fetchBalances', () => {
  it('filters out non-credit accounts', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockBalanceGet.mockResolvedValue({
      data: {
        accounts: [
          makePlaidAccount({ account_id: 'acct_credit', type: 'credit' }),
          makePlaidAccount({ account_id: 'acct_depository', type: 'depository' }),
          makePlaidAccount({ account_id: 'acct_investment', type: 'investment' }),
        ],
      },
    } as any)

    const result = await fetchBalances('access-tok')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('acct_credit')
    expect(result[0].type).toBe('credit')
  })

  it('maps Plaid fields to internal Account shape', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockBalanceGet.mockResolvedValue({
      data: {
        accounts: [
          makePlaidAccount({
            account_id: 'acct_mapped',
            name: 'My Card',
            official_name: 'Official My Card',
            subtype: 'credit card',
            balances: { current: 300, available: 700, limit: 1000, iso_currency_code: 'USD' },
          }),
        ],
      },
    } as any)

    const result = await fetchBalances('access-tok')

    expect(result[0]).toMatchObject({
      id: 'acct_mapped',
      item_id: '',        // filled in by caller
      name: 'My Card',
      official_name: 'Official My Card',
      type: 'credit',
      subtype: 'credit card',
      current_balance: 300,
      available_credit: 700,
      credit_limit: 1000,
      currency_code: 'USD',
    })
  })

  it('handles null balance fields gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockBalanceGet.mockResolvedValue({
      data: {
        accounts: [
          makePlaidAccount({
            balances: { current: null, available: null, limit: null, iso_currency_code: null },
          }),
        ],
      },
    } as any)

    const result = await fetchBalances('access-tok')

    expect(result[0].current_balance).toBeNull()
    expect(result[0].available_credit).toBeNull()
    expect(result[0].credit_limit).toBeNull()
    expect(result[0].currency_code).toBe('USD') // fallback
  })
})

// ---------------------------------------------------------------------------
// fetchTransactions
// ---------------------------------------------------------------------------

describe('fetchTransactions', () => {
  it('returns correctly shaped result for a single-page response', async () => {
    const txn = makePlaidTxn({ transaction_id: 'txn_a', amount: 42 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: {
        added: [txn],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: 'cursor_1',
      },
    } as any)

    const result = await fetchTransactions('access-tok', null)

    expect(mockTxnSync).toHaveBeenCalledTimes(1)
    expect(result.added).toHaveLength(1)
    expect(result.added[0].id).toBe('txn_a')
    expect(result.added[0].amount).toBe(42)
    expect(result.modified).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.nextCursor).toBe('cursor_1')
  })

  it('accumulates results across multiple pages', async () => {
    const txn1 = makePlaidTxn({ transaction_id: 'txn_p1' })
    const txn2 = makePlaidTxn({ transaction_id: 'txn_p2' })

    mockTxnSync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({
        data: { added: [txn1], modified: [], removed: [], has_more: true, next_cursor: 'cursor_mid' },
      } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({
        data: { added: [txn2], modified: [], removed: [], has_more: false, next_cursor: 'cursor_end' },
      } as any)

    const result = await fetchTransactions('access-tok', null)

    expect(mockTxnSync).toHaveBeenCalledTimes(2)
    expect(result.added).toHaveLength(2)
    expect(result.added.map((t) => t.id)).toEqual(['txn_p1', 'txn_p2'])
    expect(result.nextCursor).toBe('cursor_end')
  })

  it('passes cursor=undefined on the first call when cursor is null', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: { added: [], modified: [], removed: [], has_more: false, next_cursor: 'c' },
    } as any)

    await fetchTransactions('access-tok', null)

    expect(mockTxnSync).toHaveBeenCalledWith({
      access_token: 'access-tok',
      cursor: undefined,
    })
  })

  it('passes an existing cursor through to Plaid on subsequent syncs', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: { added: [], modified: [], removed: [], has_more: false, next_cursor: 'cursor_next' },
    } as any)

    await fetchTransactions('access-tok', 'cursor_existing')

    expect(mockTxnSync).toHaveBeenCalledWith({
      access_token: 'access-tok',
      cursor: 'cursor_existing',
    })
  })

  it('maps personal_finance_category fields onto internal Transaction', async () => {
    const txn = makePlaidTxn({
      personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'RESTAURANTS' },
      merchant_name: 'Chipotle',
      authorized_date: '2025-01-14',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: { added: [txn], modified: [], removed: [], has_more: false, next_cursor: 'c' },
    } as any)

    const result = await fetchTransactions('access-tok', null)
    const t = result.added[0]

    expect(t.category_primary).toBe('FOOD_AND_DRINK')
    expect(t.category_detail).toBe('RESTAURANTS')
    expect(t.merchant_name).toBe('Chipotle')
    expect(t.authorized_date).toBe('2025-01-14')
  })

  it('returns null for missing optional transaction fields', async () => {
    const txn = makePlaidTxn({
      merchant_name: null,
      personal_finance_category: null,
      authorized_date: null,
      iso_currency_code: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: { added: [txn], modified: [], removed: [], has_more: false, next_cursor: 'c' },
    } as any)

    const result = await fetchTransactions('access-tok', null)
    const t = result.added[0]

    expect(t.merchant_name).toBeNull()
    expect(t.category_primary).toBeNull()
    expect(t.category_detail).toBeNull()
    expect(t.authorized_date).toBeNull()
    expect(t.currency_code).toBe('USD') // fallback
  })

  it('collects removed transaction IDs', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockTxnSync.mockResolvedValue({
      data: {
        added: [],
        modified: [],
        removed: [{ transaction_id: 'txn_del_1' }, { transaction_id: 'txn_del_2' }],
        has_more: false,
        next_cursor: 'c',
      },
    } as any)

    const result = await fetchTransactions('access-tok', null)
    expect(result.removed).toEqual(['txn_del_1', 'txn_del_2'])
  })
})
