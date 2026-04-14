import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Single pool shared across requests in the same process.
// Works with local Postgres (TCP) and Neon (also accepts pg connections).
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
