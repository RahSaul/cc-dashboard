import { NextRequest } from 'next/server'
import {
  getAllAccounts,
  getAggregateStats,
  getRecentTransactions,
  getSpendingByDay,
  getCategoryBreakdown,
  getLastSyncInfo,
} from '@/lib/db/queries'
import { buildLastSyncInfo } from '@/lib/plaid/runSync'
import type { DashboardData } from '@/types'

export async function GET(request: NextRequest): Promise<Response> {
  const accountId =
    request.nextUrl.searchParams.get('accountId') ?? undefined

  const [accounts, aggregate, recentTransactions, spendingByDay, categoryBreakdown, lastSyncRow] =
    await Promise.all([
      getAllAccounts(),
      getAggregateStats(),
      getRecentTransactions(accountId),
      getSpendingByDay(accountId),
      getCategoryBreakdown(accountId),
      getLastSyncInfo(),
    ])

  const data: DashboardData = {
    accounts,
    aggregate,
    recentTransactions,
    spendingByDay,
    categoryBreakdown,
    lastSync: buildLastSyncInfo(lastSyncRow),
  }

  return Response.json(data)
}
