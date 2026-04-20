'use client'

import { AreaChart } from '@tremor/react'
import type { SpendingByDay } from '@/types'

interface SpendingChartProps {
  data: SpendingByDay[]
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function SpendingChart({ data }: SpendingChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    Spending: d.total,
  }))

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Spending (Last 30 Days)
      </p>
      <AreaChart
        className="mt-4 h-64"
        data={chartData}
        index="date"
        categories={['Spending']}
        colors={['blue']}
        valueFormatter={formatCurrency}
        showLegend={false}
        showGradient={true}
        curveType="monotone"
        yAxisWidth={72}
        tickGap={8}
      />
    </div>
  )
}
