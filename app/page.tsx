'use client'

import { useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import AccountSelector from '@/components/dashboard/AccountSelector'
import BalanceCard from '@/components/dashboard/BalanceCard'
import CreditUtilizationCard from '@/components/dashboard/CreditUtilizationCard'
import SpendingChart from '@/components/dashboard/SpendingChart'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import CardManagerModal from '@/components/dashboard/CardManagerModal'
import { handleSignOut } from '@/app/actions/auth'

export default function Home() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const { data, isLoading, error, mutate } = useDashboardData(selectedAccountId)

  function handleMutate() {
    setSelectedAccountId(null)
    mutate()
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' })
      const json = await res.json()
      setSyncResult(`${json.itemsProcessed} items · ${json.transactionsAdded} txns`)
      mutate()
    } catch {
      setSyncResult('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {syncResult && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{syncResult}</span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={setSelectedAccountId}
            onManageCards={() => setManageOpen(true)}
          />
        </div>

        {manageOpen && (
          <CardManagerModal
            accounts={accounts}
            onClose={() => setManageOpen(false)}
            onMutate={handleMutate}
          />
        )}

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
