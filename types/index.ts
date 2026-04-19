export interface Account {
  id: string
  item_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  current_balance: number | null
  available_credit: number | null
  credit_limit: number | null
  currency_code: string
  last_synced_at: string | null
  created_at: string
  institution_name: string | null
}

export interface Transaction {
  id: string
  account_id: string
  amount: number
  currency_code: string
  name: string
  merchant_name: string | null
  category_primary: string | null
  category_detail: string | null
  date: string
  authorized_date: string | null
  pending: boolean
  created_at: string
  updated_at: string
}

export interface SpendingByDay {
  date: string
  total: number
}

export interface CategoryBreakdown {
  category: string
  total: number
}

export interface AggregateStats {
  totalBalance: number
  totalCreditLimit: number
  totalAvailableCredit: number
}

export interface DashboardData {
  accounts: Account[]
  aggregate: AggregateStats
  recentTransactions: Transaction[]
  spendingByDay: SpendingByDay[]
  categoryBreakdown: CategoryBreakdown[]
}
