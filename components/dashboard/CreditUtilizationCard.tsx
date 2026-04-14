import type { Account } from '@/types'

interface CreditUtilizationCardProps {
  accounts: Account[]
  selectedAccountId: string | null
}

export default function CreditUtilizationCard({
  accounts,
  selectedAccountId,
}: CreditUtilizationCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Credit Utilization
      </p>
      <div className="mt-4 space-y-4">
        {accounts.map((account) => {
          const balance = account.current_balance ?? 0
          const limit = account.credit_limit ?? 1
          const utilization = Math.round((balance / limit) * 100)
          const isSelected =
            selectedAccountId === null || selectedAccountId === account.id
          const barColor =
            utilization > 70
              ? 'bg-red-500'
              : utilization > 30
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
    </div>
  )
}
