# Dashboard Components Architecture

Eight components make up the dashboard UI. Seven are purely presentational (props in, JSX out). One — `PlaidLinkButton` — initiates its own network request on mount and is the entry point for the card connection flow.

---

## Component Inventory

| File | Primary props | Role |
|---|---|---|
| `AccountSelector.tsx` | `accounts`, `selectedAccountId`, `onSelect`, `onManageCards` | Horizontal pill tabs for switching between "All Cards" and individual accounts |
| `BalanceCard.tsx` | `accounts`, `selectedAccountId` | Shows total balance and credit limit with per-account utilization bars |
| `CreditUtilizationCard.tsx` | balance / limit data | Renders a single utilization percentage ring or bar (used inside BalanceCard) |
| `SpendingChart.tsx` | `data: SpendingByDay[]` | 30-day area/bar chart of daily spend (Tremor `AreaChart`) |
| `CategoryBreakdown.tsx` | `data: CategoryBreakdown[]` | Donut chart of spend by category (Tremor `DonutChart`) |
| `RecentTransactions.tsx` | `transactions: Transaction[]` | Scrollable list of the 20 most recent transactions |
| `PlaidLinkButton.tsx` | `onSuccess: () => void` | "Connect a Card" button — fetches a link token on mount, opens Plaid Link SDK |
| `CardManagerModal.tsx` | `accounts`, `onClose`, `onMutate` | Fullscreen modal for connecting new cards and removing existing ones |

All prop types are defined in `types/index.ts`.

---

## State Ownership

`app/page.tsx` owns all state that comes from the server:

```
page.tsx
  selectedAccountId   ─── passed to AccountSelector (onSelect), useDashboardData
  manageOpen          ─── controls CardManagerModal mount
  syncing             ─── shows "Syncing…" on the Sync button
  lastSync            ─── cooldown timer display
  syncError           ─── error message below Sync button
```

No component below `page.tsx` holds server-derived state. When a component needs to trigger a data refresh it calls `onMutate()` (which calls SWR's `mutate()` in the page) — it does not manage its own SWR subscription.

The only exception is `CardManagerModal`, which holds its own `removing` (which item is being deleted) and `syncing` (post-connect sync in flight) flags — these are transient UI states that only the modal needs.

---

## PlaidLinkButton Lifecycle

This component has the most complex interaction sequence in the UI:

1. **Mount** → `useEffect` fires immediately, POSTs to `POST /api/plaid/create-link-token`
2. If the lifetime connection cap is already reached, the API returns `409` → component renders an error message, button stays disabled
3. On success, stores `link_token` in local state → Plaid's `usePlaidLink` hook becomes `ready`
4. **User clicks "Connect a Card"** → `open()` launches the Plaid Link modal overlay (runs entirely in the browser, SDK-managed)
5. User selects institution and authenticates → Plaid SDK calls `handleSuccess(public_token, metadata)` callback
6. Component POSTs to `POST /api/plaid/exchange-token` with `{ public_token, institution_id, institution_name }`
7. On success → calls `onSuccess()` (which is `CardManagerModal.handleSuccess`)
8. `CardManagerModal.handleSuccess` → POSTs to `POST /api/sync/trigger` → calls `onMutate()` → calls `onClose()`
9. Back in `page.tsx`: `handleMutate()` resets `selectedAccountId` to `null` and calls `mutate()` to revalidate SWR

---

## Card Removal Lifecycle

1. User clicks "Remove" on a connected institution row in `CardManagerModal`
2. `handleRemove(itemId)` POSTs to `POST /api/plaid/remove-item`
3. Server does best-effort `plaidClient.itemRemove()` (errors are swallowed), then `deletePlaidItem(itemId)` which cascades to `accounts` and `transactions` via FK
4. On success → `onMutate()` (SWR revalidate) → `onClose()` (modal closes)
5. On error → `removeError` state is set and displayed inline; modal stays open

---

## Purely Presentational vs. Fetch-Capable

`PlaidLinkButton` is the only component that makes its own network requests. Everything else is prop-driven with no internal fetching:

- **Fetch-capable**: `PlaidLinkButton` (link token on mount), `CardManagerModal` (remove-item, sync/trigger on card add)
- **Purely presentational**: `AccountSelector`, `BalanceCard`, `CreditUtilizationCard`, `SpendingChart`, `CategoryBreakdown`, `RecentTransactions`

This matters when debugging: if the dashboard is showing stale data, the problem is always in `page.tsx` → `useDashboardData` → `GET /api/dashboard`, never inside a presentational component.
