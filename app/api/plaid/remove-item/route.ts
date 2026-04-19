import { NextRequest } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { deletePlaidItem, getAllPlaidItems } from '@/lib/db/queries'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json()
  const { itemId } = body as { itemId?: string }

  if (!itemId || typeof itemId !== 'string') {
    return Response.json({ error: 'itemId is required' }, { status: 400 })
  }

  // Look up access_token so we can revoke on Plaid's side
  const items = await getAllPlaidItems()
  const item = items.find((i) => i.id === itemId)

  if (!item) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  // Best-effort revocation with Plaid (don't fail if it errors)
  try {
    await plaidClient.itemRemove({ access_token: item.access_token })
  } catch {
    // ignore — proceed with local deletion regardless
  }

  const deleted = await deletePlaidItem(itemId)

  if (deleted === 0) {
    return Response.json({ error: 'Item not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
