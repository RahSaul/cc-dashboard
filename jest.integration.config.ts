import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

export default createJestConfig({
  displayName: 'integration',
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
  testEnvironment: 'node',
  testTimeout: 30000,
  globalSetup: '<rootDir>/__tests__/integration/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/integration/setup/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setup/perTestSetup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
})
