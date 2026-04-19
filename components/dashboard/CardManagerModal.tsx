'use client'

import { useState } from 'react'
import type { Account } from '@/types'
import PlaidLinkButton from './PlaidLinkButton'

interface CardManagerModalProps {
  accounts: Account[]
  onClose: () => void
  onMutate: () => void
}

// Group accounts by item_id so each Plaid connection is one row
function groupByItem(accounts: Account[]): {
  itemId: string
  institutionName: string | null
  accountNames: string[]
}[] {
  const map = new Map<string, { institutionName: string | null; accountNames: string[] }>()
  for (const a of accounts) {
    if (!map.has(a.item_id)) {
      map.set(a.item_id, { institutionName: a.institution_name, accountNames: [] })
    }
    map.get(a.item_id)!.accountNames.push(a.name)
  }
  return Array.from(map.entries()).map(([itemId, v]) => ({ itemId, ...v }))
}

export default function CardManagerModal({
  accounts,
  onClose,
  onMutate,
}: CardManagerModalProps) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const groups = groupByItem(accounts)

  async function handleRemove(itemId: string) {
    setRemoving(itemId)
    setRemoveError(null)
    try {
      const res = await fetch('/api/plaid/remove-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) throw new Error('Failed to remove card')
      onMutate()
      onClose()
    } catch {
      setRemoveError('Could not remove card. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  async function handleSuccess() {
    setSyncing(true)
    try {
      await fetch('/api/sync/trigger', { method: 'POST' })
    } finally {
      setSyncing(false)
      onMutate()
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Manage Cards
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Add card */}
          <div className="mb-5">
            {syncing ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Syncing account data…</p>
            ) : (
              <PlaidLinkButton onSuccess={handleSuccess} />
            )}
          </div>

          {/* Divider */}
          {groups.length > 0 && (
            <hr className="mb-4 border-zinc-200 dark:border-zinc-700" />
          )}

          {/* Connected cards */}
          {groups.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Connected
              </p>
              {groups.map(({ itemId, institutionName, accountNames }) => (
                <div
                  key={itemId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {institutionName ?? 'Unknown Institution'}
                    </p>
                    <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                      {accountNames.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(itemId)}
                    disabled={removing === itemId}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    {removing === itemId ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {removeError && (
            <p className="mt-3 text-sm text-red-500">{removeError}</p>
          )}
        </div>
      </div>
    </>
  )
}
