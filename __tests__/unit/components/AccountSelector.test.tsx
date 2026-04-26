import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AccountSelector from '@/components/dashboard/AccountSelector'
import type { Account } from '@/types'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acct_001',
    item_id: 'item_001',
    name: 'Chase Sapphire',
    official_name: null,
    type: 'credit',
    subtype: 'credit card',
    current_balance: 500,
    available_credit: 4500,
    credit_limit: 5000,
    currency_code: 'USD',
    last_synced_at: null,
    created_at: '2025-01-01',
    institution_name: 'Chase',
    ...overrides,
  }
}

const ACCOUNTS: Account[] = [
  makeAccount({ id: 'acct_1', name: 'Chase Sapphire' }),
  makeAccount({ id: 'acct_2', name: 'Amex Gold' }),
]

describe('AccountSelector', () => {
  it('renders an "All Cards" button and one button per account', () => {
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId={null}
        onSelect={jest.fn()}
        onManageCards={jest.fn()}
      />,
    )

    expect(screen.getByText('All Cards')).toBeInTheDocument()
    expect(screen.getByText('Chase Sapphire')).toBeInTheDocument()
    expect(screen.getByText('Amex Gold')).toBeInTheDocument()
  })

  it('calls onSelect(null) when "All Cards" is clicked', () => {
    const onSelect = jest.fn()
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId={null}
        onSelect={onSelect}
        onManageCards={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByText('All Cards'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('calls onSelect(account.id) when an account button is clicked', () => {
    const onSelect = jest.fn()
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId={null}
        onSelect={onSelect}
        onManageCards={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Chase Sapphire'))
    expect(onSelect).toHaveBeenCalledWith('acct_1')
  })

  it('applies the active class to "All Cards" when selectedAccountId is null', () => {
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId={null}
        onSelect={jest.fn()}
        onManageCards={jest.fn()}
      />,
    )

    const allCardsBtn = screen.getByText('All Cards')
    expect(allCardsBtn.className).toContain('bg-zinc-900')
  })

  it('applies the active class to the selected account button', () => {
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId="acct_1"
        onSelect={jest.fn()}
        onManageCards={jest.fn()}
      />,
    )

    const chaseBtn = screen.getByText('Chase Sapphire')
    expect(chaseBtn.className).toContain('bg-zinc-900')

    // "All Cards" should NOT be active
    const allCardsBtn = screen.getByText('All Cards')
    expect(allCardsBtn.className).not.toContain('bg-zinc-900')
  })

  it('calls onManageCards when "Manage Cards" is clicked', () => {
    const onManageCards = jest.fn()
    render(
      <AccountSelector
        accounts={ACCOUNTS}
        selectedAccountId={null}
        onSelect={jest.fn()}
        onManageCards={onManageCards}
      />,
    )

    fireEvent.click(screen.getByText('Manage Cards'))
    expect(onManageCards).toHaveBeenCalledTimes(1)
  })
})
