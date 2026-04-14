import { NextRequest } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { upsertPlaidItem } from '@/lib/db/queries'

export async function POST(request: NextRequest): Promise<Response> {
  const { public_token, institution_id, institution_name } =
    await request.json()

  if (!public_token) {
    return new Response(JSON.stringify({ error: 'public_token is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
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

  return Response.json({ success: true, item_id })
}
