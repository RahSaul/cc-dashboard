import { NextRequest } from 'next/server'
import {
  getAllAccounts,
  getAggregateStats,
  getRecentTransactions,
  getSpendingByDay,
  getCategoryBreakdown,
} from '@/lib/db/queries'
import type { DashboardData } from '@/types'

export async function GET(request: NextRequest): Promise<Response> {
  const accountId =
    request.nextUrl.searchParams.get('accountId') ?? undefined

  const [accounts, aggregate, recentTransactions, spendingByDay, categoryBreakdown] =
    await Promise.all([
      getAllAccounts(),
      getAggregateStats(),
      getRecentTransactions(accountId),
      getSpendingByDay(accountId),
      getCategoryBreakdown(accountId),
    ])

  const data: DashboardData = {
    accounts,
    aggregate,
    recentTransactions,
    spendingByDay,
    categoryBreakdown,
  }

  return Response.json(data)
}
