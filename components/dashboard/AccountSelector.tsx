'use client'

import type { Account } from '@/types'

interface AccountSelectorProps {
  accounts: Account[]
  selectedAccountId: string | null
  onSelect: (accountId: string | null) => void
  onManageCards: () => void
}

export default function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect,
  onManageCards,
}: AccountSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            selectedAccountId === null
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          All Cards
        </button>
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSelect(account.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedAccountId === account.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {account.name}
          </button>
        ))}
      </div>
      <button
        onClick={onManageCards}
        className="shrink-0 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Manage Cards
      </button>
    </div>
  )
}
