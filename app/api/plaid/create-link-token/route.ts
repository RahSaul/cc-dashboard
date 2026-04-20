import { plaidClient } from '@/lib/plaid/client'
import { countLifetimePlaidConnections } from '@/lib/db/queries'
import { CountryCode, Products } from 'plaid'

export async function POST(): Promise<Response> {
  const maxConnections = parseInt(process.env.MAX_LIFETIME_PLAID_CONNECTIONS ?? '10', 10)
  const lifetimeCount = await countLifetimePlaidConnections()
  if (lifetimeCount >= maxConnections) {
    return Response.json(
      { error: `Card connection limit (${maxConnections}) reached. Remove a card first.` },
      { status: 409 },
    )
  }

  const response = await plaidClient.linkTokenCreate({
    client_name: 'CC Dashboard',
    language: 'en',
    country_codes: [CountryCode.Us],
    user: { client_user_id: 'dashboard-user' },
    products: [Products.Transactions],
  })

  return Response.json({ link_token: response.data.link_token })
}
