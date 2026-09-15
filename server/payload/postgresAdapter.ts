import { postgresAdapter } from '@payloadcms/db-postgres'

/**
 * Payload 3.89 rejects `initializing` without a reason when PostgreSQL cannot
 * connect. Observing that separate promise keeps the original rejection intact
 * for Payload callers while preventing Node from reporting a detached rejection.
 */
export const observedPostgresAdapter: typeof postgresAdapter = (options) => {
  const factory = postgresAdapter(options)
  const initialize = factory.init

  return {
    ...factory,
    init: (args) => {
      const adapter = initialize(args)
      void adapter.initializing.catch(() => undefined)

      return adapter
    },
  }
}
