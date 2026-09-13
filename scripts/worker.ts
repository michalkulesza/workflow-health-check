import { setTimeout } from 'node:timers/promises'

import { loadPayload } from './payloadRuntime'
import { dispatchAssessmentOutbox } from '../server/jobs/outbox'

const main = async () => {
  const payload = await loadPayload()
  const once = process.argv.includes('--once')
  let stopping = false

  const stop = () => {
    stopping = true
  }

  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  try {
    do {
      const dispatched = await dispatchAssessmentOutbox(payload)

      // Trusted local worker; HTTP job execution is denied in payload.config.
      const result = await payload.jobs.run({
        allQueues: true,
        limit: 2,
        overrideAccess: true,
      })
      payload.logger.info({ event: 'worker-cycle', dispatched, ...result })

      if (!once && !stopping) {
        await setTimeout(1000)
      }
    } while (!once && !stopping)
  } finally {
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
    await payload.destroy()
  }
}

main().catch(() => {
  console.error(
    'Worker failed. Check database connectivity and server configuration.'
  )

  process.exitCode = 1
})
