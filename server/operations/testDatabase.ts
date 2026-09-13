import { URL } from 'node:url'

const approvedDatabaseName = 'workflow_spike'

export const assertDisposableTestDatabase = (
  environment: Record<string, string | undefined>
) => {
  if (environment.RUN_INTEGRATION_TESTS !== 'true') {
    throw new Error(
      'Set RUN_INTEGRATION_TESTS=true to run database integration tests'
    )
  }

  const databaseURL = environment.DATABASE_URL

  if (!databaseURL) {
    throw new Error('Set DATABASE_URL to the disposable integration database')
  }

  let parsed: URL

  try {
    parsed = new URL(databaseURL)
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL')
  }

  const databaseName = decodeURIComponent(parsed.pathname).replace(/^\//, '')

  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    databaseName !== approvedDatabaseName
  ) {
    throw new Error(
      'Integration tests require the exact disposable database name workflow_spike'
    )
  }
}
