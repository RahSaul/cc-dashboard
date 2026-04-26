import React from 'react'
import { render, screen } from '@testing-library/react'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import type { Transaction } from '@/types'

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn_001',
    account_id: 'acct_001',
    amount: 42.0,
    currency_code: 'USD',
    name: 'Test Store',
    merchant_name: null,
    category_primary: 'FOOD_AND_DRINK',
    category_detail: null,
    date: '2025-01-15',
    authorized_date: null,
    pending: false,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    ...overrides,
  }
}

describe('RecentTransactions', () => {
  it('renders merchant_name when present', () => {
    render(
      <RecentTransactions
        transactions={[makeTxn({ merchant_name: 'Starbucks', name: 'SBX Store #123' })]}
      />,
    )
    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.queryByText('SBX Store #123')).toBeNull()
  })

  it('falls back to name when merchant_name is null', () => {
    render(
      <RecentTransactions
        transactions={[makeTxn({ merchant_name: null, name: 'AMZN Mktp US' })]}
      />,
    )
    expect(screen.getByText('AMZN Mktp US')).toBeInTheDocument()
  })

  it('shows the "Pending" badge for pending transactions', () => {
    render(
      <RecentTransactions transactions={[makeTxn({ pending: true })]} />,
    )
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('does not show "Pending" badge for settled transactions', () => {
    render(
      <RecentTransactions transactions={[makeTxn({ pending: false })]} />,
    )
    expect(screen.queryByText('Pending')).toBeNull()
  })

  it('renders transactions sorted by date descending', () => {
    const transactions = [
      makeTxn({ id: 'txn_a', name: 'Earlier', date: '2025-01-10' }),
      makeTxn({ id: 'txn_c', name: 'Latest', date: '2025-01-20' }),
      makeTxn({ id: 'txn_b', name: 'Middle', date: '2025-01-15' }),
    ]
    render(<RecentTransactions transactions={transactions} />)

    const items = screen.getAllByText(/Earlier|Latest|Middle/)
    expect(items[0]).toHaveTextContent('Latest')
    expect(items[1]).toHaveTextContent('Middle')
    expect(items[2]).toHaveTextContent('Earlier')
  })

  it('renders at most 20 transactions even when more are provided', () => {
    const transactions = Array.from({ length: 25 }, (_, i) =>
      makeTxn({ id: `txn_${i}`, name: `Merchant ${i}`, date: '2025-01-01' }),
    )
    render(<RecentTransactions transactions={transactions} />)

    // Each transaction renders one element with the merchant name.
    // There are 25 names: Merchant 0 to Merchant 24. At most 20 should appear.
    const allItems = screen.getAllByText(/^Merchant \d+$/)
    expect(allItems).toHaveLength(20)
  })

  it('formats the amount as USD currency', () => {
    render(<RecentTransactions transactions={[makeTxn({ amount: 1234.56 })]} />)
    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })
})
