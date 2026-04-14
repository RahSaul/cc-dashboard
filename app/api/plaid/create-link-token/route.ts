import { plaidClient } from '@/lib/plaid/client'
import { CountryCode, Products } from 'plaid'

export async function POST(): Promise<Response> {
  const response = await plaidClient.linkTokenCreate({
    client_name: 'CC Dashboard',
    language: 'en',
    country_codes: [CountryCode.Us],
    user: { client_user_id: 'dashboard-user' },
    products: [Products.Transactions],
  })

  return Response.json({ link_token: response.data.link_token })
}
