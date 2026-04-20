'use client'

import { useState, useEffect } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import AccountSelector from '@/components/dashboard/AccountSelector'
import BalanceCard from '@/components/dashboard/BalanceCard'
import SpendingChart from '@/components/dashboard/SpendingChart'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import CardManagerModal from '@/components/dashboard/CardManagerModal'
import { handleSignOut } from '@/app/actions/auth'
import type { LastSyncInfo } from '@/types'

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
}

export default function Home() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<LastSyncInfo | null>(null)

  const { data, isLoading, error, mutate } = useDashboardData(selectedAccountId)

  useEffect(() => {
    if (data?.lastSync) setLastSync(data.lastSync)
  }, [data?.lastSync])

  const isCoolingDown = (lastSync?.cooldownRemainingMs ?? 0) > 0

  function handleMutate() {
    setSelectedAccountId(null)
    mutate()
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' })
      const json = await res.json()
      if (json.lastSync) setLastSync(json.lastSync)
      mutate()
    } catch {
      // sync failed — leave lastSync state as-is
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

  const { accounts, recentTransactions, spendingByDay, categoryBreakdown } = data

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || isCoolingDown}
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
            {lastSync && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Last synced {formatRelative(lastSync.at)}
                {lastSync.by ? ` by ${lastSync.by}` : ''}
                {isCoolingDown
                  ? ` · available in ${Math.ceil(lastSync.cooldownRemainingMs / 60_000)}m`
                  : ''}
              </p>
            )}
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

        <div className="mt-6">
          <BalanceCard
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
