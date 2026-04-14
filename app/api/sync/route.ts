import { NextRequest } from 'next/server'
import { fetchBalances, fetchTransactions } from '@/lib/plaid/sync'
import {
  getAllPlaidItems,
  upsertAccount,
  upsertTransactions,
  deleteTransactions,
  updatePlaidItemCursor,
} from '@/lib/db/queries'

export async function GET(request: NextRequest): Promise<Response> {
  return handleSync(request)
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleSync(request)
}

async function handleSync(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const items = await getAllPlaidItems()

  if (items.length === 0) {
    return Response.json({ synced: true, itemsProcessed: 0, accountsUpdated: 0, transactionsAdded: 0 })
  }

  let totalAccountsUpdated = 0
  let totalTransactionsAdded = 0

  for (const item of items) {
    // Fetch and upsert balances (credit accounts only)
    const accounts = await fetchBalances(item.access_token)
    for (const account of accounts) {
      await upsertAccount({ ...account, item_id: item.id })
    }
    totalAccountsUpdated += accounts.length

    // Fetch and upsert transactions (cursor-based incremental sync)
    // Filter to only accounts we saved — avoids FK violations for non-credit accounts
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

  return Response.json({
    synced: true,
    itemsProcessed: items.length,
    accountsUpdated: totalAccountsUpdated,
    transactionsAdded: totalTransactionsAdded,
  })
}
