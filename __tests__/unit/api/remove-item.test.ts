/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/plaid/remove-item/route'
import { getAllPlaidItems, deletePlaidItem } from '@/lib/db/queries'
import { plaidClient } from '@/lib/plaid/client'

jest.mock('@/lib/db/queries')
jest.mock('@/lib/plaid/client', () => ({
  plaidClient: {
    itemRemove: jest.fn(),
  },
}))

const mockGetAllPlaidItems = jest.mocked(getAllPlaidItems)
const mockDeletePlaidItem = jest.mocked(deletePlaidItem)
const mockItemRemove = jest.mocked(plaidClient.itemRemove)

const EXISTING_ITEM = {
  id: 'item_001',
  access_token: 'access-tok-001',
  transactions_cursor: null,
  last_synced_at: null,
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/plaid/remove-item', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetAllPlaidItems.mockResolvedValue([EXISTING_ITEM])
  mockDeletePlaidItem.mockResolvedValue(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockItemRemove.mockResolvedValue({ data: {} } as any)
})

describe('POST /api/plaid/remove-item', () => {
  it('returns 400 when itemId is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('itemId')
  })

  it('returns 400 when itemId is not a string', async () => {
    const res = await POST(makeRequest({ itemId: 123 }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the item is not found in the database', async () => {
    mockGetAllPlaidItems.mockResolvedValue([])
    const res = await POST(makeRequest({ itemId: 'item_nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns 200 on happy path and calls itemRemove and deletePlaidItem', async () => {
    const res = await POST(makeRequest({ itemId: 'item_001' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(mockItemRemove).toHaveBeenCalledWith({ access_token: 'access-tok-001' })
    expect(mockDeletePlaidItem).toHaveBeenCalledWith('item_001')
  })

  it('still calls deletePlaidItem even when Plaid itemRemove throws', async () => {
    mockItemRemove.mockRejectedValue(new Error('Plaid error'))

    const res = await POST(makeRequest({ itemId: 'item_001' }))

    // Best-effort: should still succeed locally
    expect(res.status).toBe(200)
    expect(mockDeletePlaidItem).toHaveBeenCalledWith('item_001')
  })

  it('returns 404 when deletePlaidItem returns 0 (race condition)', async () => {
    mockDeletePlaidItem.mockResolvedValue(0)

    const res = await POST(makeRequest({ itemId: 'item_001' }))
    expect(res.status).toBe(404)
  })
})
