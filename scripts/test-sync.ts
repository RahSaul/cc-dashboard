/**
 * Manually triggers the /api/sync endpoint.
 *
 * Usage:
 *   CRON_SECRET=<secret> npx ts-node --project tsconfig.scripts.json scripts/test-sync.ts
 *
 * Defaults to http://localhost:3000 unless BASE_URL is set.
 */
async function testSync() {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new Error('CRON_SECRET environment variable is not set')
  }

  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/api/sync`

  console.log(`POST ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  })

  const body = await res.json()
  console.log(`Status: ${res.status}`)
  console.log('Response:', JSON.stringify(body, null, 2))

  if (!res.ok) process.exit(1)
}

testSync().catch((err) => {
  console.error('test-sync failed:', err)
  process.exit(1)
})
