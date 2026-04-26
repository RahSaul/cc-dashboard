/**
 * @jest-environment node
 */
import { POST } from '@/app/api/plaid/create-link-token/route'
import { countLifetimePlaidConnections } from '@/lib/db/queries'
import { plaidClient } from '@/lib/plaid/client'

jest.mock('@/lib/db/queries')
jest.mock('@/lib/plaid/client', () => ({
  plaidClient: {
    linkTokenCreate: jest.fn(),
  },
}))

const mockCountLifetime = jest.mocked(countLifetimePlaidConnections)
const mockLinkTokenCreate = jest.mocked(plaidClient.linkTokenCreate)

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.MAX_LIFETIME_PLAID_CONNECTIONS
})

describe('POST /api/plaid/create-link-token', () => {
  it('returns 409 when lifetime connection cap is reached', async () => {
    process.env.MAX_LIFETIME_PLAID_CONNECTIONS = '3'
    mockCountLifetime.mockResolvedValue(3)

    const res = await POST()

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('limit')
    expect(mockLinkTokenCreate).not.toHaveBeenCalled()
  })

  it('returns link_token when under the cap', async () => {
    mockCountLifetime.mockResolvedValue(2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockLinkTokenCreate.mockResolvedValue({ data: { link_token: 'link-tok-abc' } } as any)

    const res = await POST()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.link_token).toBe('link-tok-abc')
    expect(mockLinkTokenCreate).toHaveBeenCalledTimes(1)
  })

  it('uses default cap of 10 when env var is not set', async () => {
    mockCountLifetime.mockResolvedValue(10)

    const res = await POST()
    expect(res.status).toBe(409)
  })
})
