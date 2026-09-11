import { randomUUID } from 'node:crypto'

import { loadPayload } from './payloadRuntime'

const main = async () => {
  const action = process.argv[2]

  if (action !== 'queue' && action !== 'inspect') {
    throw new Error('Usage: fixtureJob.ts queue | inspect <job-id>')
  }

  const payload = await loadPayload()

  try {
    if (action === 'queue') {
      const job = await payload.jobs.queue({
        task: 'fixture',
        queue: 'compatibility',
        input: { marker: randomUUID() },
        overrideAccess: true,
      })
      console.log(JSON.stringify({ jobId: job.id, marker: job.input }))
    } else {
      const id = Number(process.argv[3])

      if (!Number.isSafeInteger(id) || id < 1) {
        throw new Error('A positive numeric job ID is required')
      }

      const job = await payload.findByID({
        collection: 'payload-jobs',
        id,
        overrideAccess: true,
      })

      console.log(
        JSON.stringify({
          id: job.id,
          completedAt: job.completedAt,
          hasError: job.hasError,
          log: job.log,
        })
      )

      if (!job.completedAt || job.hasError) {
        process.exitCode = 1
      }
    }
  } finally {
    await payload.destroy()
  }
}

main().catch(() => {
  console.error(
    'Fixture check failed. Check arguments and database configuration.'
  )

  process.exitCode = 1
})
