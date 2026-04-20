import { fetchBalances, fetchTransactions } from './sync'
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
import type { LastSyncInfo } from '@/types'

export interface SyncResult {
  synced: boolean
  itemsProcessed: number
  accountsUpdated: number
  transactionsAdded: number
}

export function buildLastSyncInfo(
  row: { synced_at: Date; triggered_by: string | null } | null,
): LastSyncInfo | null {
  if (!row) return null
  const cooldownMs = parseInt(process.env.SYNC_COOLDOWN_MINUTES ?? '30', 10) * 60_000
  const ageMs = Date.now() - row.synced_at.getTime()
  return {
    at: row.synced_at.toISOString(),
    by: row.triggered_by,
    cooldownRemainingMs: Math.max(0, cooldownMs - ageMs),
  }
}

export async function runSync(triggeredBy: string): Promise<SyncResult> {
  const items = await getAllPlaidItems()

  const hasNewItems = items.some((item) => !item.last_synced_at)

  if (!hasNewItems) {
    const maxDailySyncs = parseInt(process.env.MAX_DAILY_SYNCS ?? '10', 10)
    const todaySyncs = await countTodaySyncs()
    if (todaySyncs >= maxDailySyncs) {
      console.log(`[runSync] Daily sync cap (${maxDailySyncs}) reached`)
      return { synced: false, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 }
    }

    const cooldownMs = parseInt(process.env.SYNC_COOLDOWN_MINUTES ?? '30', 10) * 60_000
    const lastSyncRow = await getLastSyncInfo()
    if (lastSyncRow) {
      const ageMs = Date.now() - lastSyncRow.synced_at.getTime()
      if (ageMs < cooldownMs) {
        console.log(`[runSync] Cooldown active — last sync was ${Math.round(ageMs / 60_000)}m ago`)
        return { synced: false, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 }
      }
    }
  }

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

  await logSync(triggeredBy)

  return {
    synced: true,
    itemsProcessed: items.length,
    accountsUpdated: totalAccountsUpdated,
    transactionsAdded: totalTransactionsAdded,
  }
}
