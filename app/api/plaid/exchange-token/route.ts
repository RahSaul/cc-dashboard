import { NextRequest } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { upsertPlaidItem, countLifetimePlaidConnections, logPlaidConnection } from '@/lib/db/queries'

export async function POST(request: NextRequest): Promise<Response> {
  const { public_token, institution_id, institution_name } =
    await request.json()

  if (!public_token) {
    return new Response(JSON.stringify({ error: 'public_token is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const maxConnections = parseInt(process.env.MAX_LIFETIME_PLAID_CONNECTIONS ?? '10', 10)
  const lifetimeCount = await countLifetimePlaidConnections()
  if (lifetimeCount >= maxConnections) {
    return Response.json(
      { error: `Card connection limit (${maxConnections}) reached. Contact your admin to increase the limit.` },
      { status: 409 },
    )
  }

  const response = await plaidClient.itemPublicTokenExchange({
    public_token,
  })

  const { access_token, item_id } = response.data

  await upsertPlaidItem({
    id: item_id,
    access_token,
    institution_id: institution_id ?? null,
    institution_name: institution_name ?? null,
  })

  await logPlaidConnection()

  return Response.json({ success: true, item_id })
}
