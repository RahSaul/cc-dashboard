import type { Transaction } from '@/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  const sorted = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Recent Transactions
        </p>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sorted.map((txn) => (
          <div
            key={txn.id}
            className="flex items-center justify-between px-6 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {txn.merchant_name ?? txn.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {txn.category_primary}
                {txn.pending && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Pending
                  </span>
                )}
              </p>
            </div>
            <div className="ml-4 text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(txn.amount)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatDate(txn.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
