/**
 * Creates all tables and indexes in the target database.
 * Uses pg.Pool so it works with both local Postgres and Neon.
 *
 * Usage:
 *   DATABASE_URL=<connection_string> npx ts-node --project tsconfig.scripts.json scripts/migrate.ts
 *
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 */
import { Pool } from 'pg'
import { CREATE_TABLES } from '../lib/db/schema'

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString: databaseUrl })

  console.log('Running migrations...')
  await pool.query(CREATE_TABLES)
  console.log('Migrations complete.')

  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
