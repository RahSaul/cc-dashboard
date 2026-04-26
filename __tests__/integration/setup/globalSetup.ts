import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import { CREATE_TABLES } from '../../../lib/db/schema'

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const connectionString = container.getConnectionUri()

  // Run DDL against the fresh container
  const client = new Client({ connectionString })
  await client.connect()
  await client.query(CREATE_TABLES)
  await client.end()

  // globalSetup and globalTeardown run in the same Jest orchestrator process,
  // so storing on global is the standard pattern for sharing the container ref.
  ;(global as Record<string, unknown>).__POSTGRES_CONTAINER__ = container

  // process.env mutations in globalSetup ARE propagated to Jest worker
  // processes. We override DATABASE_URL so lib/db/index.ts picks up the
  // test container instead of the real database.
  process.env.DATABASE_URL = connectionString
}
