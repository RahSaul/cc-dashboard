import { Pool } from 'pg'

// Lazily create the pool so DATABASE_URL is already set (by globalSetup) when
// this module is first imported.
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

beforeAll(() => {
  // The lib/db/index singleton pool may still have open connections when the
  // testcontainer stops. Add an error listener so those termination events
  // don't produce an unhandled-error crash at the end of the test run.
  //
  // We import dynamically to avoid the module being loaded before DATABASE_URL
  // is set by globalSetup.
  void import('@/lib/db/index').then(({ pool: libPool }) => {
    libPool.on('error', () => { /* swallow shutdown-termination errors */ })
  })
})

beforeEach(async () => {
  // Truncate in dependency order so FK constraints are satisfied
  await getPool().query(`
    TRUNCATE TABLE
      transactions,
      accounts,
      plaid_items,
      sync_log,
      plaid_connections_log
    RESTART IDENTITY CASCADE
  `)
})

afterAll(async () => {
  await pool?.end()
  pool = null
})
