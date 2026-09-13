import {
  inspectRetention,
  purgeExpiredPrivateData,
} from '../server/operations/retention'
import { loadPayload } from './payloadRuntime'

const main = async () => {
  const payload = await loadPayload()

  try {
    if (process.env.RETENTION_PURGE_APPROVED !== 'true') {
      console.log(
        JSON.stringify({ dryRun: true, ...(await inspectRetention(payload)) })
      )

      console.log(
        'Set RETENTION_PURGE_APPROVED=true only after policy approval to delete private data.'
      )

      return
    }

    console.log(
      JSON.stringify({
        dryRun: false,
        ...(await purgeExpiredPrivateData(payload)),
      })
    )
  } finally {
    await payload.destroy()
  }
}

main().catch(() => {
  console.error(
    'Retention purge failed. No credentials or private data were logged.'
  )

  process.exitCode = 1
})
