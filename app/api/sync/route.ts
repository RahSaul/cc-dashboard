import { NextRequest } from 'next/server'
import { runSync } from '@/lib/plaid/runSync'

export async function GET(request: NextRequest): Promise<Response> {
  return handleSync(request)
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleSync(request)
}

async function handleSync(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await runSync('cron')
  return Response.json(result)
}
