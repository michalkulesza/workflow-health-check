import { hasRecentWorkerHeartbeat } from '../server/operations/heartbeat'
import { loadPayload } from './payloadRuntime'

const main = async () => {
  const payload = await loadPayload()

  try {
    if (!(await hasRecentWorkerHeartbeat(payload))) {
      throw new Error('Worker heartbeat is stale')
    }
  } finally {
    await payload.destroy()
  }
}

main().catch(() => {
  console.error('Worker is not ready.')
  process.exitCode = 1
})
