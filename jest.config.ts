import type { Config } from 'jest'

// Each project has its own config file so it gets the correct
// Next.js SWC transform and testEnvironment independently.
const config: Config = {
  projects: [
    '<rootDir>/jest.unit.config.ts',
    '<rootDir>/jest.integration.config.ts',
  ],
  coverageProvider: 'v8',
}

export default config
