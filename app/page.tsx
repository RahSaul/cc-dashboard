'use client'

import { useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import AccountSelector from '@/components/dashboard/AccountSelector'
import BalanceCard from '@/components/dashboard/BalanceCard'
import CreditUtilizationCard from '@/components/dashboard/CreditUtilizationCard'
import SpendingChart from '@/components/dashboard/SpendingChart'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import RecentTransactions from '@/components/dashboard/RecentTransactions'

export default function Home() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  )

  const { data, isLoading, error } = useDashboardData(selectedAccountId)

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-red-500">
          Failed to load dashboard data. Is the database connected?
        </p>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  const { accounts, aggregate, recentTransactions, spendingByDay, categoryBreakdown } = data

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>

        <div className="mt-6">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={setSelectedAccountId}
          />
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <BalanceCard
            accounts={accounts}
            aggregate={aggregate}
            selectedAccountId={selectedAccountId}
          />
          <CreditUtilizationCard
            accounts={accounts}
            selectedAccountId={selectedAccountId}
          />
        </div>

        <div className="mt-6">
          <SpendingChart data={spendingByDay} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CategoryBreakdown data={categoryBreakdown} />
          <RecentTransactions transactions={recentTransactions} />
        </div>
      </div>
    </div>
  )
}
