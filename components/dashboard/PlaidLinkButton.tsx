'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import type { PlaidLinkOnSuccess } from 'react-plaid-link'

interface PlaidLinkButtonProps {
  onSuccess: () => void
}

export default function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to initialise Plaid Link')
        setLinkToken(data.link_token)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to initialise Plaid Link'))
  }, [])

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution_id: metadata.institution?.institution_id ?? null,
            institution_name: metadata.institution?.name ?? null,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'Failed to connect account.')
        }
        onSuccess()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect account. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [onSuccess],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  })

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => open()}
        disabled={!ready || loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? 'Connecting…' : '+ Connect a Card'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
