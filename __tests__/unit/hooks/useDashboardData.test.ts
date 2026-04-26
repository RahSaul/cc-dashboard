import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardData } from '@/hooks/useDashboardData'

// Mock SWR to control fetcher behavior without real HTTP calls
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

import useSWR from 'swr'
const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseSWR.mockReturnValue({
    data: undefined,
    error: undefined,
    isLoading: true,
    mutate: jest.fn(),
  } as ReturnType<typeof useSWR>)
})

describe('useDashboardData', () => {
  it('uses /api/dashboard as the SWR key when no accountId is provided', () => {
    renderHook(() => useDashboardData())
    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/dashboard',
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('uses /api/dashboard?accountId=... when accountId is provided', () => {
    renderHook(() => useDashboardData('acct_abc'))
    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/dashboard?accountId=acct_abc',
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('uses /api/dashboard when accountId is null', () => {
    renderHook(() => useDashboardData(null))
    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/dashboard',
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('URL-encodes the accountId', () => {
    renderHook(() => useDashboardData('acct id with spaces'))
    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/dashboard?accountId=acct%20id%20with%20spaces',
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('returns the shape from SWR (data, isLoading, error, mutate)', () => {
    const mockMutate = jest.fn()
    mockUseSWR.mockReturnValue({
      data: { accounts: [], aggregate: { totalBalance: 0, totalCreditLimit: 0, totalAvailableCredit: 0 }, recentTransactions: [], spendingByDay: [], categoryBreakdown: [], lastSync: null },
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useSWR>)

    const { result } = renderHook(() => useDashboardData())
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data?.accounts).toEqual([])
    expect(result.current.mutate).toBe(mockMutate)
  })

  it('the fetcher throws when the response is not ok', async () => {
    // Extract the fetcher passed to useSWR
    let capturedFetcher: ((url: string) => Promise<unknown>) | null = null
    mockUseSWR.mockImplementation((_key, fetcher) => {
      capturedFetcher = fetcher as (url: string) => Promise<unknown>
      return { data: undefined, error: undefined, isLoading: true, mutate: jest.fn() } as ReturnType<typeof useSWR>
    })

    renderHook(() => useDashboardData())

    // Simulate a non-ok response
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as Response)

    await expect(capturedFetcher!('/api/dashboard')).rejects.toThrow('Dashboard fetch failed: 500')
  })
})
