import { auth } from '@/auth'
import { getLastSyncInfo } from '@/lib/db/queries'
import { runSync, buildLastSyncInfo } from '@/lib/plaid/runSync'

export async function POST(): Promise<Response> {
  const session = await auth()
  const triggeredBy = session?.user?.name ?? session?.user?.email ?? 'unknown'

  const result = await runSync(triggeredBy)

  const lastSyncRow = await getLastSyncInfo()
  return Response.json({ ...result, lastSync: buildLastSyncInfo(lastSyncRow) })
}
