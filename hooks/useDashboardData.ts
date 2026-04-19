'use client'

import useSWR from 'swr'
import type { DashboardData } from '@/types'

const fetcher = (url: string): Promise<DashboardData> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`)
    return res.json()
  })

export function useDashboardData(accountId?: string | null): {
  data: DashboardData | undefined
  isLoading: boolean
  error: Error | undefined
  mutate: () => void
} {
  const url = accountId
    ? `/api/dashboard?accountId=${encodeURIComponent(accountId)}`
    : '/api/dashboard'

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(url, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  return { data, isLoading, error, mutate }
}
