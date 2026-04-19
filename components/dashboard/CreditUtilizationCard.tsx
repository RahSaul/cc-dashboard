'use client'

import { useState } from 'react'
import type { Account } from '@/types'

interface CreditUtilizationCardProps {
  accounts: Account[]
  selectedAccountId: string | null
}

export default function CreditUtilizationCard({
  accounts,
  selectedAccountId,
}: CreditUtilizationCardProps) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Credit Utilization
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

      <div className="mt-4 space-y-4">
        {accounts.map((account) => {
          const balance = account.current_balance ?? 0
          const limit = account.credit_limit ?? 1
          const remaining = limit - balance
          const utilization = Math.round((remaining / limit) * 100)
          const isSelected =
            selectedAccountId === null || selectedAccountId === account.id
          const barColor =
            utilization < 30
              ? 'bg-red-500'
              : utilization < 70
                ? 'bg-amber-500'
                : 'bg-emerald-500'

          return (
            <div
              key={account.id}
              className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {account.name}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {utilization}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

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
                How utilization is calculated
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
              Utilization shows how much of your credit limit is still available.
            </p>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              (limit − balance) ÷ limit × 100
            </div>
            <div className="mt-4 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-emerald-500" />
                <span>Above 70% — plenty of credit remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-amber-500" />
                <span>30–70% — moderate usage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-3 rounded-full bg-red-500" />
                <span>Below 30% — most of your limit is used</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
