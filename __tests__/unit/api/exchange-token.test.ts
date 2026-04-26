/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/plaid/exchange-token/route'
import {
  countLifetimePlaidConnections,
  upsertPlaidItem,
  logPlaidConnection,
} from '@/lib/db/queries'
import { plaidClient } from '@/lib/plaid/client'

jest.mock('@/lib/db/queries')
jest.mock('@/lib/plaid/client', () => ({
  plaidClient: {
    itemPublicTokenExchange: jest.fn(),
  },
}))

const mockCountLifetime = jest.mocked(countLifetimePlaidConnections)
const mockExchange = jest.mocked(plaidClient.itemPublicTokenExchange)
const mockUpsertPlaidItem = jest.mocked(upsertPlaidItem)
const mockLogPlaidConnection = jest.mocked(logPlaidConnection)

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.MAX_LIFETIME_PLAID_CONNECTIONS
  mockCountLifetime.mockResolvedValue(0)
  mockUpsertPlaidItem.mockResolvedValue(undefined)
  mockLogPlaidConnection.mockResolvedValue(undefined)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockExchange.mockResolvedValue({ data: { access_token: 'access-tok', item_id: 'item-001' } } as any)
})

describe('POST /api/plaid/exchange-token', () => {
  it('returns 400 when public_token is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('public_token')
  })

  it('returns 409 when lifetime connection cap is reached', async () => {
    process.env.MAX_LIFETIME_PLAID_CONNECTIONS = '5'
    mockCountLifetime.mockResolvedValue(5)

    const res = await POST(makeRequest({ public_token: 'pub-tok' }))

    expect(res.status).toBe(409)
    expect(mockExchange).not.toHaveBeenCalled()
  })

  it('returns success with item_id on happy path', async () => {
    const res = await POST(
      makeRequest({
        public_token: 'pub-tok',
        institution_id: 'ins_1',
        institution_name: 'Chase',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, item_id: 'item-001' })

    expect(mockExchange).toHaveBeenCalledWith({ public_token: 'pub-tok' })
    expect(mockUpsertPlaidItem).toHaveBeenCalledWith({
      id: 'item-001',
      access_token: 'access-tok',
      institution_id: 'ins_1',
      institution_name: 'Chase',
    })
    expect(mockLogPlaidConnection).toHaveBeenCalledTimes(1)
  })

  it('passes null for optional institution fields when omitted', async () => {
    await POST(makeRequest({ public_token: 'pub-tok' }))

    expect(mockUpsertPlaidItem).toHaveBeenCalledWith(
      expect.objectContaining({ institution_id: null, institution_name: null }),
    )
  })
})
