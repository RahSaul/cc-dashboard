import { runSync } from '@/lib/plaid/runSync'

export async function POST(): Promise<Response> {
  const result = await runSync()
  return Response.json(result)
}
