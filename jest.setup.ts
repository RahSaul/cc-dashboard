import '@testing-library/jest-dom'

// Prevent lib/db/index.ts from throwing during unit test module load.
// The real pool is never used in unit tests because @/lib/db/queries is mocked.
process.env.DATABASE_URL ??= 'postgresql://localhost/unit_test_dummy'
