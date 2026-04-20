import { fetchBalances, fetchTransactions } from './sync'
import {
  getAllPlaidItems,
  upsertAccount,
  upsertTransactions,
  deleteTransactions,
  updatePlaidItemCursor,
  countTodaySyncs,
  getLastSyncTime,
  logSync,
} from '@/lib/db/queries'

export interface SyncResult {
  synced: boolean
  itemsProcessed: number
  accountsUpdated: number
  transactionsAdded: number
}

export async function runSync(): Promise<SyncResult> {
  const maxDailySyncs = parseInt(process.env.MAX_DAILY_SYNCS ?? '10', 10)
  const todaySyncs = await countTodaySyncs()
  if (todaySyncs >= maxDailySyncs) {
    console.log(`[runSync] Daily sync cap (${maxDailySyncs}) reached`)
    return { synced: false, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 }
  }

  const cooldownMs = parseInt(process.env.SYNC_COOLDOWN_MINUTES ?? '30', 10) * 60_000
  const lastSync = await getLastSyncTime()
  if (lastSync) {
    const ageMs = Date.now() - lastSync.getTime()
    if (ageMs < cooldownMs) {
      console.log(`[runSync] Cooldown active — last sync was ${Math.round(ageMs / 60_000)}m ago`)
      return { synced: false, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 }
    }
  }

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

  await logSync()

  return {
    synced: true,
    itemsProcessed: items.length,
    accountsUpdated: totalAccountsUpdated,
    transactionsAdded: totalTransactionsAdded,
  }
}
