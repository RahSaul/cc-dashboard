/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sync/route'
import { runSync } from '@/lib/plaid/runSync'

jest.mock('@/lib/plaid/runSync')

const mockRunSync = jest.mocked(runSync)

const SYNC_RESULT = {
  synced: true,
  itemsProcessed: 1,
  accountsUpdated: 2,
  transactionsAdded: 5,
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret-abc'
  mockRunSync.mockResolvedValue(SYNC_RESULT)
})

function makeRequest(method: 'GET' | 'POST', authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/sync', { method, headers })
}

describe('GET /api/sync', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when the secret is wrong', async () => {
    const res = await GET(makeRequest('GET', 'Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 200 and calls runSync("cron") with a valid Bearer token', async () => {
    const res = await GET(makeRequest('GET', 'Bearer test-secret-abc'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(SYNC_RESULT)
    expect(mockRunSync).toHaveBeenCalledWith('cron')
  })
})

describe('POST /api/sync', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(401)
  })

  it('returns 200 and calls runSync("cron") with a valid Bearer token', async () => {
    const res = await POST(makeRequest('POST', 'Bearer test-secret-abc'))
    expect(res.status).toBe(200)
    expect(mockRunSync).toHaveBeenCalledWith('cron')
  })
})
