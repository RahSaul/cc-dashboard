import type {
  Account,
  Transaction,
  SpendingByDay,
  CategoryBreakdown,
  AggregateStats,
  DashboardData,
} from '@/types'

// ---------------------------------------------------------------------------
// Accounts — two credit cards from different institutions
// ---------------------------------------------------------------------------

const ITEM_CHASE = 'item_chase_001'
const ITEM_CITI = 'item_citi_002'

const ACCOUNT_CHASE_ID = 'acc_chase_sapphire'
const ACCOUNT_CITI_ID = 'acc_citi_double'

export const FIXTURE_ACCOUNTS: Account[] = [
  {
    id: ACCOUNT_CHASE_ID,
    item_id: ITEM_CHASE,
    name: 'Sapphire Preferred',
    official_name: 'Chase Sapphire Preferred Card',
    type: 'credit',
    subtype: 'credit card',
    current_balance: 2_347.89,
    available_credit: 7_652.11,
    credit_limit: 10_000,
    currency_code: 'USD',
    last_synced_at: '2026-04-13T10:00:00Z',
    created_at: '2026-01-15T08:00:00Z',
    institution_name: 'Chase',
  },
  {
    id: ACCOUNT_CITI_ID,
    item_id: ITEM_CITI,
    name: 'Double Cash',
    official_name: 'Citi Double Cash Card',
    type: 'credit',
    subtype: 'credit card',
    current_balance: 1_128.44,
    available_credit: 3_871.56,
    credit_limit: 5_000,
    currency_code: 'USD',
    last_synced_at: '2026-04-13T10:00:00Z',
    created_at: '2026-02-01T08:00:00Z',
    institution_name: 'Citi',
  },
]

// ---------------------------------------------------------------------------
// Transactions — ~20 entries spread across both cards over the last 30 days
// ---------------------------------------------------------------------------

let txnSeq = 0
function txn(
  accountId: string,
  amount: number,
  name: string,
  merchantName: string | null,
  categoryPrimary: string,
  categoryDetail: string | null,
  date: string,
  pending = false,
): Transaction {
  txnSeq++
  return {
    id: `txn_${String(txnSeq).padStart(3, '0')}`,
    account_id: accountId,
    amount,
    currency_code: 'USD',
    name,
    merchant_name: merchantName,
    category_primary: categoryPrimary,
    category_detail: categoryDetail,
    date,
    authorized_date: pending ? null : date,
    pending,
    created_at: `${date}T12:00:00Z`,
    updated_at: `${date}T12:00:00Z`,
  }
}

export const FIXTURE_TRANSACTIONS: Transaction[] = [
  // Chase — dining, travel, groceries, subscriptions
  txn(ACCOUNT_CHASE_ID, 42.50, 'Nobu Downtown', 'Nobu', 'Food and Drink', 'Restaurants', '2026-04-12'),
  txn(ACCOUNT_CHASE_ID, 156.00, 'Delta Airlines', 'Delta', 'Travel', 'Airlines', '2026-04-10'),
  txn(ACCOUNT_CHASE_ID, 89.32, 'Whole Foods Market', 'Whole Foods', 'Groceries', null, '2026-04-09'),
  txn(ACCOUNT_CHASE_ID, 15.99, 'Netflix', 'Netflix', 'Entertainment', 'Streaming', '2026-04-07'),
  txn(ACCOUNT_CHASE_ID, 234.00, 'Marriott Hotels', 'Marriott', 'Travel', 'Hotels', '2026-04-05'),
  txn(ACCOUNT_CHASE_ID, 67.80, 'Shell Gas Station', 'Shell', 'Transportation', 'Gas', '2026-04-03'),
  txn(ACCOUNT_CHASE_ID, 28.45, 'Chipotle', 'Chipotle', 'Food and Drink', 'Restaurants', '2026-04-01'),
  txn(ACCOUNT_CHASE_ID, 12.99, 'Spotify', 'Spotify', 'Entertainment', 'Streaming', '2026-03-28'),
  txn(ACCOUNT_CHASE_ID, 320.00, 'United Airlines', 'United', 'Travel', 'Airlines', '2026-03-25'),
  txn(ACCOUNT_CHASE_ID, 45.67, 'Trader Joe\'s', 'Trader Joe\'s', 'Groceries', null, '2026-03-22'),

  // Citi — everyday spending, utilities, shopping
  txn(ACCOUNT_CITI_ID, 52.14, 'Target', 'Target', 'Shopping', 'General', '2026-04-11'),
  txn(ACCOUNT_CITI_ID, 127.50, 'Con Edison', 'Con Edison', 'Utilities', 'Electric', '2026-04-08'),
  txn(ACCOUNT_CITI_ID, 35.00, 'Uber', 'Uber', 'Transportation', 'Rideshare', '2026-04-06'),
  txn(ACCOUNT_CITI_ID, 78.90, 'Amazon', 'Amazon', 'Shopping', 'Online', '2026-04-04'),
  txn(ACCOUNT_CITI_ID, 9.99, 'iCloud Storage', 'Apple', 'Entertainment', 'Subscriptions', '2026-04-02'),
  txn(ACCOUNT_CITI_ID, 145.00, 'Verizon Wireless', 'Verizon', 'Utilities', 'Phone', '2026-03-30'),
  txn(ACCOUNT_CITI_ID, 62.30, 'CVS Pharmacy', 'CVS', 'Health', 'Pharmacy', '2026-03-27'),
  txn(ACCOUNT_CITI_ID, 41.20, 'Starbucks', 'Starbucks', 'Food and Drink', 'Coffee Shops', '2026-03-24'),
  txn(ACCOUNT_CITI_ID, 210.00, 'Best Buy', 'Best Buy', 'Shopping', 'Electronics', '2026-03-20'),
  txn(ACCOUNT_CITI_ID, 18.50, 'Lyft', 'Lyft', 'Transportation', 'Rideshare', '2026-03-18', true),
]

// ---------------------------------------------------------------------------
// Aggregations — pre-computed for the "All Cards" view
// ---------------------------------------------------------------------------

export const FIXTURE_SPENDING_BY_DAY: SpendingByDay[] = [
  { date: '2026-03-18', total: 18.50 },
  { date: '2026-03-20', total: 210.00 },
  { date: '2026-03-22', total: 45.67 },
  { date: '2026-03-24', total: 41.20 },
  { date: '2026-03-25', total: 320.00 },
  { date: '2026-03-27', total: 62.30 },
  { date: '2026-03-28', total: 12.99 },
  { date: '2026-03-30', total: 145.00 },
  { date: '2026-04-01', total: 28.45 },
  { date: '2026-04-02', total: 9.99 },
  { date: '2026-04-03', total: 67.80 },
  { date: '2026-04-04', total: 78.90 },
  { date: '2026-04-05', total: 234.00 },
  { date: '2026-04-06', total: 35.00 },
  { date: '2026-04-07', total: 15.99 },
  { date: '2026-04-08', total: 127.50 },
  { date: '2026-04-09', total: 89.32 },
  { date: '2026-04-10', total: 156.00 },
  { date: '2026-04-11', total: 52.14 },
  { date: '2026-04-12', total: 42.50 },
]

export const FIXTURE_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { category: 'Travel', total: 710.00 },
  { category: 'Shopping', total: 341.04 },
  { category: 'Utilities', total: 272.50 },
  { category: 'Food and Drink', total: 112.15 },
  { category: 'Groceries', total: 134.99 },
  { category: 'Transportation', total: 121.30 },
  { category: 'Entertainment', total: 38.97 },
  { category: 'Health', total: 62.30 },
]

export const FIXTURE_AGGREGATE: AggregateStats = {
  totalBalance: 2_347.89 + 1_128.44,     // 3_476.33
  totalCreditLimit: 10_000 + 5_000,       // 15_000
  totalAvailableCredit: 7_652.11 + 3_871.56, // 11_523.67
}

// ---------------------------------------------------------------------------
// Pre-assembled dashboard response — "All Cards" view
// ---------------------------------------------------------------------------

export const FIXTURE_DASHBOARD_DATA: DashboardData = {
  accounts: FIXTURE_ACCOUNTS,
  aggregate: FIXTURE_AGGREGATE,
  recentTransactions: FIXTURE_TRANSACTIONS,
  spendingByDay: FIXTURE_SPENDING_BY_DAY,
  categoryBreakdown: FIXTURE_CATEGORY_BREAKDOWN,
  lastSync: null,
}
