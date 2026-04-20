'use client'

import { useState } from 'react'
import type { Account } from '@/types'

interface BalanceCardProps {
  accounts: Account[]
  selectedAccountId: string | null
}

function formatCurrency(value: number | null): string {
  if (value === null) return '--'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getBalance(account: Account): number {
  const limit = account.credit_limit ?? 0
  const available = account.available_credit ?? (limit - (account.current_balance ?? 0))
  return limit - available
}

function getUtilization(account: Account): number {
  const limit = account.credit_limit ?? 1
  const available = account.available_credit ?? (limit - (account.current_balance ?? 0))
  return Math.round(((limit - available) / limit) * 100)
}

function barColor(utilization: number): string {
  if (utilization > 70) return 'bg-red-500'
  if (utilization > 30) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export default function BalanceCard({ accounts, selectedAccountId }: BalanceCardProps) {
  const [showInfo, setShowInfo] = useState(false)

  const visibleAccounts = selectedAccountId
    ? accounts.filter((a) => a.id === selectedAccountId)
    : accounts

  const totalBalance = visibleAccounts.reduce((sum, a) => sum + getBalance(a), 0)
  const totalLimit = visibleAccounts.reduce((sum, a) => sum + (a.credit_limit ?? 0), 0)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {selectedAccountId ? visibleAccounts[0]?.name ?? 'Balance' : 'Total Balance'}
        </p>
        <button
          onClick={() => setShowInfo(true)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="About credit utilization"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      {/* Hero number */}
      <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {formatCurrency(totalBalance)}
      </p>
      {totalLimit > 0 && (
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          of {formatCurrency(totalLimit)} limit
        </p>
      )}

      {/* Per-account rows */}
      <div className="mt-4 space-y-4">
        {visibleAccounts.map((account) => {
          const balance = getBalance(account)
          const utilization = getUtilization(account)
          const available = account.available_credit ?? ((account.credit_limit ?? 0) - balance)

          return (
            <div key={account.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                {!selectedAccountId && (
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {account.name}
                  </span>
                )}
                <div className={`flex items-center gap-3 ${!selectedAccountId ? '' : 'w-full justify-between'}`}>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(balance)}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {utilization}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${barColor(utilization)}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {formatCurrency(available)} available · {formatCurrency(account.credit_limit)} limit
              </p>
            </div>
          )
        })}
      </div>

      {/* Info modal */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="mx-4 max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                How balance is calculated
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Balance and utilization are derived from the real-time available credit reported by your bank — more accurate than posted statement balances.
            </p>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              balance = limit − available_credit
            </div>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              utilization = balance ÷ limit × 100
            </div>
            <div className="mt-4 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-emerald-500" />
                <span>Below 30% — healthy usage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-amber-500" />
                <span>30–70% — moderate usage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-red-500" />
                <span>Above 70% — most of your limit is used</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
