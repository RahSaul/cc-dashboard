'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlaidLinkButton from '@/components/setup/PlaidLinkButton'

export default function SetupPage() {
  const router = useRouter()
  const [connected, setConnected] = useState(0)

  function handleSuccess() {
    setConnected((n) => n + 1)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Connect Your Cards
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Link one or more credit cards via Plaid. Each connection is synced
          nightly and shown on your dashboard.
        </p>
      </div>

      <PlaidLinkButton onSuccess={handleSuccess} />

      {connected > 0 && (
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {connected} card{connected > 1 ? 's' : ''} connected successfully.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-3 text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Go to dashboard →
          </button>
        </div>
      )}
    </div>
  )
}
