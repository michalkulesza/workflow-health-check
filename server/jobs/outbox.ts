import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

const LEASE_SECONDS = 60

type OutboxWork = {
  id: number
  runID: number
  leaseToken: string
  type: 'deterministic_score' | 'ai_evaluation'
}

const claimWork = async (payload: Payload): Promise<OutboxWork | null> => {
  const client = await payload.db.pool.connect()
  const leaseToken = randomUUID()

  try {
    await client.query('BEGIN')

    const work = await client.query<{
      id: number
      payload: { runID: number }
      type: OutboxWork['type']
    }>(
      `SELECT id, payload, type FROM assessment_outbox
        WHERE type IN ('deterministic_score', 'ai_evaluation')
          AND (state = 'pending' OR (state = 'leased' AND lease_expires_at < now()))
        ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`
    )
    const row = work.rows[0]

    if (!row) {
      await client.query('COMMIT')

      return null
    }

    await client.query(
      `UPDATE assessment_outbox
          SET state = 'leased', lease_token = $1,
              lease_expires_at = now() + ($2 * interval '1 second'),
              attempts = attempts + 1, updated_at = now()
        WHERE id = $3`,
      [leaseToken, LEASE_SECONDS, row.id]
    )

    await client.query('COMMIT')

    return { id: row.id, runID: row.payload.runID, leaseToken, type: row.type }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const dispatchAssessmentOutbox = async (
  payload: Payload
): Promise<number> => {
  let dispatched = 0
  let work = await claimWork(payload)

  while (work) {
    try {
      const task =
        work.type === 'deterministic_score'
          ? 'deterministic-score'
          : 'ai-evaluation'

      const job = await payload.jobs.queue({
        input: { outboxID: work.id, runID: work.runID },
        overrideAccess: true,
        queue: 'assessment',
        task,
      })

      await payload.db.pool.query(
        `UPDATE assessment_outbox
            SET state = 'dispatched', payload_job_id = $1,
                lease_token = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE id = $2 AND lease_token = $3`,
        [job.id, work.id, work.leaseToken]
      )

      dispatched += 1
    } catch (error) {
      await payload.db.pool.query(
        `UPDATE assessment_outbox
            SET state = 'pending', lease_token = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE id = $1 AND lease_token = $2`,
        [work.id, work.leaseToken]
      )

      throw error
    }

    work = await claimWork(payload)
  }

  return dispatched
}
