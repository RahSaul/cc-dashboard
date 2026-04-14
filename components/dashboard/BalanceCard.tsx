import type { Account, AggregateStats } from '@/types'

interface BalanceCardProps {
  accounts: Account[]
  aggregate: AggregateStats
  selectedAccountId: string | null
}

function formatCurrency(value: number | null): string {
  if (value === null) return '--'
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function BalanceCard({
  accounts,
  aggregate,
  selectedAccountId,
}: BalanceCardProps) {
  if (selectedAccountId) {
    const account = accounts.find((a) => a.id === selectedAccountId)
    if (!account) return null

    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Current Balance
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {formatCurrency(account.current_balance)}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>Credit Limit</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatCurrency(account.credit_limit)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>Available Credit</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatCurrency(account.available_credit)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Total Balance
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {formatCurrency(aggregate.totalBalance)}
      </p>
      <div className="mt-4 space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-zinc-500 dark:text-zinc-400">
              {account.name}
            </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatCurrency(account.current_balance)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>Total Credit Limit</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatCurrency(aggregate.totalCreditLimit)}
          </span>
        </div>
      </div>
    </div>
  )
}
