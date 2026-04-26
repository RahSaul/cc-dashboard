import { NextRequest } from 'next/server'
import { Pool } from 'pg'
import { GET } from '@/app/api/dashboard/route'
import type { DashboardData } from '@/types'
import {
  createFixturePlaidItem,
  createFixtureAccount,
  createFixtureTransaction,
} from '../setup/dbHelpers'

let pool: Pool

beforeAll(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
})

afterAll(async () => {
  await pool.end()
})

function makeRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/dashboard')
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }
  }
  return new NextRequest(url)
}

describe('GET /api/dashboard (integration)', () => {
  it('returns empty collections and zero aggregates when the database is empty', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body: DashboardData = await res.json()
    expect(body.accounts).toEqual([])
    expect(body.recentTransactions).toEqual([])
    expect(body.spendingByDay).toEqual([])
    expect(body.categoryBreakdown).toEqual([])
    expect(body.lastSync).toBeNull()
    expect(body.aggregate.totalBalance).toBe(0)
    expect(body.aggregate.totalCreditLimit).toBe(0)
    expect(body.aggregate.totalAvailableCredit).toBe(0)
  })

  it('returns populated data when fixture data exists', async () => {
    await createFixturePlaidItem(pool, { id: 'item_dash' })
    await createFixtureAccount(pool, {
      id: 'acct_dash',
      item_id: 'item_dash',
      credit_limit: 5000,
      available_credit: 4000,
      current_balance: 1000,
    })
    await createFixtureTransaction(pool, {
      id: 'txn_dash',
      account_id: 'acct_dash',
      amount: 50,
      date: new Date().toISOString().slice(0, 10),
    })
    // Add a sync log entry
    await pool.query(`INSERT INTO sync_log (triggered_by) VALUES ('setup')`)

    const res = await GET(makeRequest())
    const body: DashboardData = await res.json()

    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0].id).toBe('acct_dash')
    expect(body.recentTransactions).toHaveLength(1)
    expect(body.aggregate.totalCreditLimit).toBe(5000)
    expect(body.aggregate.totalAvailableCredit).toBe(4000)
    expect(body.lastSync).not.toBeNull()
    expect(body.lastSync!.cooldownRemainingMs).toBeGreaterThanOrEqual(0)
  })

  it('filters recentTransactions by accountId query param', async () => {
    await createFixturePlaidItem(pool, { id: 'item_filter' })
    await createFixtureAccount(pool, { id: 'acct_filter_a', item_id: 'item_filter', name: 'Card A' })
    await createFixtureAccount(pool, { id: 'acct_filter_b', item_id: 'item_filter', name: 'Card B' })
    await createFixtureTransaction(pool, { id: 'txn_fa', account_id: 'acct_filter_a', name: 'Txn A' })
    await createFixtureTransaction(pool, { id: 'txn_fb', account_id: 'acct_filter_b', name: 'Txn B' })

    const res = await GET(makeRequest({ accountId: 'acct_filter_a' }))
    const body: DashboardData = await res.json()

    expect(body.recentTransactions.every((t) => t.account_id === 'acct_filter_a')).toBe(true)
    expect(body.recentTransactions.find((t) => t.id === 'txn_fb')).toBeUndefined()
  })
})
