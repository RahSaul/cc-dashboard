import { plaidClient } from './client'
import type { Account, Transaction } from '@/types'

export async function fetchBalances(accessToken: string): Promise<Account[]> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
    options: { min_last_updated_datetime: yesterday },
  })

  return response.data.accounts
    .filter((a) => a.type === 'credit')
    .map((a) => ({
      id: a.account_id,
      item_id: '',                          // filled in by the sync route
      name: a.name,
      official_name: a.official_name ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      current_balance: a.balances.current ?? null,
      available_credit: a.balances.available ?? null,
      credit_limit: a.balances.limit ?? null,
      currency_code: a.balances.iso_currency_code ?? 'USD',
      last_synced_at: null,
      created_at: new Date().toISOString(),
    }))
}

export async function fetchTransactions(
  accessToken: string,
  cursor: string | null,
): Promise<{
  added: Transaction[]
  modified: Transaction[]
  removed: string[]
  nextCursor: string
}> {
  const added: Transaction[] = []
  const modified: Transaction[] = []
  const removed: string[] = []
  let currentCursor = cursor ?? undefined
  let hasMore = true

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: currentCursor,
    })

    const { data } = response

    for (const t of data.added) {
      added.push(mapTransaction(t))
    }
    for (const t of data.modified) {
      modified.push(mapTransaction(t))
    }
    for (const t of data.removed) {
      removed.push(t.transaction_id)
    }

    hasMore = data.has_more
    currentCursor = data.next_cursor
  }

  return { added, modified, removed, nextCursor: currentCursor! }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransaction(t: any): Transaction {
  return {
    id: t.transaction_id,
    account_id: t.account_id,
    amount: t.amount,
    currency_code: t.iso_currency_code ?? 'USD',
    name: t.name,
    merchant_name: t.merchant_name ?? null,
    category_primary: t.personal_finance_category?.primary ?? null,
    category_detail: t.personal_finance_category?.detailed ?? null,
    date: t.date,
    authorized_date: t.authorized_date ?? null,
    pending: t.pending,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
