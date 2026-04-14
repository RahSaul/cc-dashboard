export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS plaid_items (
  id                  TEXT PRIMARY KEY,
  access_token        TEXT NOT NULL,
  institution_id      TEXT,
  institution_name    TEXT,
  transactions_cursor TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS accounts (
  id               TEXT PRIMARY KEY,
  item_id          TEXT NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  official_name    TEXT,
  type             TEXT NOT NULL,
  subtype          TEXT,
  current_balance  NUMERIC(12, 2),
  available_credit NUMERIC(12, 2),
  credit_limit     NUMERIC(12, 2),
  currency_code    TEXT DEFAULT 'USD',
  last_synced_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount           NUMERIC(12, 2) NOT NULL,
  currency_code    TEXT DEFAULT 'USD',
  name             TEXT NOT NULL,
  merchant_name    TEXT,
  category_primary TEXT,
  category_detail  TEXT,
  date             DATE NOT NULL,
  authorized_date  DATE,
  pending          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON transactions(account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions(date DESC);
`
