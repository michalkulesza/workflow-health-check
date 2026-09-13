import { describe, expect, it } from 'vitest'

import { assertDisposableTestDatabase } from './testDatabase'

const environment = {
  DATABASE_URL: 'postgresql://workflow:password@localhost:5432/workflow_spike',
  RUN_INTEGRATION_TESTS: 'true',
}

describe('integration database guard', () => {
  it('accepts only the explicit disposable database', () => {
    expect(() => assertDisposableTestDatabase(environment)).not.toThrow()
  })

  it('rejects lookalike and non-test targets before mutation', () => {
    expect(() =>
      assertDisposableTestDatabase({
        ...environment,
        DATABASE_URL:
          'postgresql://workflow:password@localhost:5432/workflow_spike_production',
      })
    ).toThrow(/exact disposable database/i)

    expect(() =>
      assertDisposableTestDatabase({
        ...environment,
        RUN_INTEGRATION_TESTS: 'false',
      })
    ).toThrow(/RUN_INTEGRATION_TESTS/)
  })
})
