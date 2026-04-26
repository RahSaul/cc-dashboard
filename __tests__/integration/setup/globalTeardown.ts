import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'

export default async function globalTeardown() {
  const container = (global as Record<string, unknown>)
    .__POSTGRES_CONTAINER__ as StartedPostgreSqlContainer | undefined
  await container?.stop()
}
