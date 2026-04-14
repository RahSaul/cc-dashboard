'use client'

import { DonutChart } from '@tremor/react'
import type { CategoryBreakdown as CategoryBreakdownType } from '@/types'

interface CategoryBreakdownProps {
  data: CategoryBreakdownType[]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Spending by Category
      </p>
      <DonutChart
        className="mt-4 h-52"
        data={data}
        category="total"
        index="category"
        valueFormatter={formatCurrency}
        colors={[
          'blue',
          'violet',
          'amber',
          'rose',
          'emerald',
          'cyan',
          'orange',
          'fuchsia',
        ]}
        showLabel={true}
        label={formatCurrency(total)}
      />
    </div>
  )
}
