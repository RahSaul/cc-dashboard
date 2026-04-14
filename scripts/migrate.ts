/**
 * Creates all tables and indexes in the target database.
 *
 * Usage:
 *   DATABASE_URL=<connection_string> npx ts-node scripts/migrate.ts
 *
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 */
import { neon } from '@neondatabase/serverless'
import { CREATE_TABLES } from '../lib/db/schema'

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = neon(databaseUrl)

  console.log('Running migrations...')
  await sql.unsafe(CREATE_TABLES)
  console.log('Migrations complete.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
