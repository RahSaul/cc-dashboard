'use client'

import { useState } from 'react'
import {
  FIXTURE_DASHBOARD_DATA,
  FIXTURE_TRANSACTIONS,
  FIXTURE_SPENDING_BY_DAY,
  FIXTURE_CATEGORY_BREAKDOWN,
} from '@/lib/fixtures'
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

  const { accounts, aggregate } = FIXTURE_DASHBOARD_DATA

  const transactions = selectedAccountId
    ? FIXTURE_TRANSACTIONS.filter((t) => t.account_id === selectedAccountId)
    : FIXTURE_TRANSACTIONS

  const spendingByDay = selectedAccountId
    ? computeSpendingByDay(transactions)
    : FIXTURE_SPENDING_BY_DAY

  const categoryBreakdown = selectedAccountId
    ? computeCategoryBreakdown(transactions)
    : FIXTURE_CATEGORY_BREAKDOWN

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
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  )
}

function computeSpendingByDay(
  transactions: typeof FIXTURE_TRANSACTIONS,
): { date: string; total: number }[] {
  const byDay = new Map<string, number>()
  for (const txn of transactions) {
    byDay.set(txn.date, (byDay.get(txn.date) ?? 0) + txn.amount)
  }
  return [...byDay.entries()]
    .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function computeCategoryBreakdown(
  transactions: typeof FIXTURE_TRANSACTIONS,
): { category: string; total: number }[] {
  const byCat = new Map<string, number>()
  for (const txn of transactions) {
    const cat = txn.category_primary ?? 'Other'
    byCat.set(cat, (byCat.get(cat) ?? 0) + txn.amount)
  }
  return [...byCat.entries()]
    .map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
}
