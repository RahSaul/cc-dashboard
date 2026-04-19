import { fetchBalances, fetchTransactions } from './sync'
import {
  getAllPlaidItems,
  upsertAccount,
  upsertTransactions,
  deleteTransactions,
  updatePlaidItemCursor,
} from '@/lib/db/queries'

export interface SyncResult {
  synced: boolean
  itemsProcessed: number
  accountsUpdated: number
  transactionsAdded: number
}

export async function runSync(): Promise<SyncResult> {
  const items = await getAllPlaidItems()

  if (items.length === 0) {
    return { synced: true, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 }
  }

  let totalAccountsUpdated = 0
  let totalTransactionsAdded = 0

  for (const item of items) {
    const accounts = await fetchBalances(item.access_token)
    for (const account of accounts) {
      await upsertAccount({ ...account, item_id: item.id })
    }
    totalAccountsUpdated += accounts.length

    const savedAccountIds = new Set(accounts.map((a) => a.id))
    const { added, modified, removed, nextCursor } = await fetchTransactions(
      item.access_token,
      item.transactions_cursor,
    )

    const filteredAdded = added.filter((t) => savedAccountIds.has(t.account_id))
    const filteredModified = modified.filter((t) => savedAccountIds.has(t.account_id))

    if (removed.length > 0) {
      await deleteTransactions(removed)
    }
    if (filteredAdded.length > 0 || filteredModified.length > 0) {
      await upsertTransactions([...filteredAdded, ...filteredModified])
    }

    await updatePlaidItemCursor(item.id, nextCursor)

    totalTransactionsAdded += added.length
  }

  return {
    synced: true,
    itemsProcessed: items.length,
    accountsUpdated: totalAccountsUpdated,
    transactionsAdded: totalTransactionsAdded,
  }
}
