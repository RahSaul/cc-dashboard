import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BalanceCard from '@/components/dashboard/BalanceCard'
import type { Account } from '@/types'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acct_001',
    item_id: 'item_001',
    name: 'Chase Sapphire',
    official_name: null,
    type: 'credit',
    subtype: 'credit card',
    current_balance: 300,
    available_credit: 700,
    credit_limit: 1000,
    currency_code: 'USD',
    last_synced_at: null,
    created_at: '2025-01-01',
    institution_name: 'Chase',
    ...overrides,
  }
}

describe('BalanceCard', () => {
  it('renders without crashing with no accounts', () => {
    render(<BalanceCard accounts={[]} selectedAccountId={null} />)
    // $0.00 because there are no accounts
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('displays the correct balance derived from limit - available_credit', () => {
    // balance = 1000 - 700 = 300
    const account = makeAccount({ credit_limit: 1000, available_credit: 700 })
    render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0)
  })

  it('shows 30% utilization for a 300/1000 balance', () => {
    const account = makeAccount({ credit_limit: 1000, available_credit: 700 })
    render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('uses emerald bar color for utilization ≤ 30%', () => {
    // 200/1000 = 20%
    const account = makeAccount({ credit_limit: 1000, available_credit: 800 })
    const { container } = render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    const bar = container.querySelector('.bg-emerald-500')
    expect(bar).toBeInTheDocument()
  })

  it('uses amber bar color for 30 < utilization ≤ 70%', () => {
    // 500/1000 = 50%
    const account = makeAccount({ credit_limit: 1000, available_credit: 500 })
    const { container } = render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    const bar = container.querySelector('.bg-amber-500')
    expect(bar).toBeInTheDocument()
  })

  it('uses red bar color for utilization > 70%', () => {
    // 800/1000 = 80%
    const account = makeAccount({ credit_limit: 1000, available_credit: 200 })
    const { container } = render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    const bar = container.querySelector('.bg-red-500')
    expect(bar).toBeInTheDocument()
  })

  it('falls back to limit - current_balance when available_credit is null', () => {
    // balance = 1000 - (1000 - 600) = 600 (using current_balance fallback)
    const account = makeAccount({
      credit_limit: 1000,
      available_credit: null,
      current_balance: 600,
    })
    render(<BalanceCard accounts={[account]} selectedAccountId={null} />)
    expect(screen.getAllByText('$600.00').length).toBeGreaterThan(0)
  })

  it('filters to selectedAccountId when one is set', () => {
    const accounts = [
      makeAccount({ id: 'acct_1', name: 'Chase Sapphire', credit_limit: 1000, available_credit: 700 }),
      makeAccount({ id: 'acct_2', name: 'Amex Gold', credit_limit: 5000, available_credit: 4000 }),
    ]
    render(<BalanceCard accounts={accounts} selectedAccountId="acct_1" />)

    // Should show Chase balance only (300), not the Amex balance (1000)
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0)
    expect(screen.queryByText('$1,000.00')).toBeNull()
  })

  it('opens the info modal when the info button is clicked', () => {
    const account = makeAccount()
    render(<BalanceCard accounts={[account]} selectedAccountId={null} />)

    expect(screen.queryByText('How balance is calculated')).toBeNull()

    fireEvent.click(screen.getByLabelText('About credit utilization'))
    expect(screen.getByText('How balance is calculated')).toBeInTheDocument()
  })

  it('closes the info modal when the close button inside is clicked', () => {
    const account = makeAccount()
    render(<BalanceCard accounts={[account]} selectedAccountId={null} />)

    fireEvent.click(screen.getByLabelText('About credit utilization'))
    expect(screen.getByText('How balance is calculated')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByText('How balance is calculated')).toBeNull()
  })

  it('closes the info modal when the backdrop is clicked', () => {
    const account = makeAccount()
    const { container } = render(<BalanceCard accounts={[account]} selectedAccountId={null} />)

    fireEvent.click(screen.getByLabelText('About credit utilization'))
    expect(screen.getByText('How balance is calculated')).toBeInTheDocument()

    // Click the backdrop (fixed overlay div)
    const backdrop = container.querySelector('.fixed')!
    fireEvent.click(backdrop)
    expect(screen.queryByText('How balance is calculated')).toBeNull()
  })
})
