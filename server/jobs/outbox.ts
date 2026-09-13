import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

const LEASE_SECONDS = 60

type OutboxWork = {
  deliveryID?: number
  id: number
  runID?: number
  leaseToken: string
  type:
    | 'deterministic_score'
    | 'ai_evaluation'
    | 'category_aggregation'
    | 'narrative'
    | 'report_email'
}

const claimWork = async (payload: Payload): Promise<OutboxWork | null> => {
  const client = await payload.db.pool.connect()
  const leaseToken = randomUUID()

  try {
    await client.query('BEGIN')

    const work = await client.query<{
      id: number
      payload: { deliveryID?: number; runID?: number }
      type: OutboxWork['type']
    }>(
      `SELECT id, payload, type FROM assessment_outbox
        WHERE type IN ('deterministic_score', 'ai_evaluation', 'category_aggregation', 'narrative', 'report_email')
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

    if (row.type === 'report_email' && !row.payload.deliveryID) {
      throw new Error(`Report email outbox ${row.id} has no delivery ID`)
    }

    if (row.type !== 'report_email' && !row.payload.runID) {
      throw new Error(`Assessment outbox ${row.id} has no run ID`)
    }

    return {
      id: row.id,
      ...(row.payload.runID === undefined ? {} : { runID: row.payload.runID }),
      ...(row.payload.deliveryID === undefined
        ? {}
        : { deliveryID: row.payload.deliveryID }),
      leaseToken,
      type: row.type,
    }
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
    const claimedWork = work

    try {
      let task:
        | 'deterministic-score'
        | 'ai-evaluation'
        | 'category-aggregation'
        | 'assessment-narrative'

      switch (claimedWork.type) {
        case 'deterministic_score':
          task = 'deterministic-score'
          break
        case 'ai_evaluation':
          task = 'ai-evaluation'
          break
        case 'category_aggregation':
          task = 'category-aggregation'
          break
        case 'narrative':
          task = 'assessment-narrative'
          break
        case 'report_email': {
          const deliveryID = claimedWork.deliveryID

          if (deliveryID === undefined) {
            throw new Error(
              `Report email outbox ${claimedWork.id} has no delivery ID`
            )
          }

          const job = await payload.jobs.queue({
            input: { outboxID: claimedWork.id, deliveryID },
            overrideAccess: true,
            queue: 'assessment',
            task: 'report-email',
          })

          await payload.db.pool.query(
            `UPDATE assessment_outbox
                  SET state = 'dispatched', payload_job_id = $1,
                      lease_token = NULL, lease_expires_at = NULL, updated_at = now()
                WHERE id = $2 AND lease_token = $3`,
            [job.id, claimedWork.id, claimedWork.leaseToken]
          )

          dispatched += 1
          work = await claimWork(payload)
          continue
        }
      }

      const runID = claimedWork.runID

      if (runID === undefined) {
        throw new Error(`Assessment outbox ${claimedWork.id} has no run ID`)
      }

      const job = await payload.jobs.queue({
        input: { outboxID: claimedWork.id, runID },
        overrideAccess: true,
        queue: 'assessment',
        task,
      })

      await payload.db.pool.query(
        `UPDATE assessment_outbox
            SET state = 'dispatched', payload_job_id = $1,
                lease_token = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE id = $2 AND lease_token = $3`,
        [job.id, claimedWork.id, claimedWork.leaseToken]
      )

      dispatched += 1
    } catch (error) {
      await payload.db.pool.query(
        `UPDATE assessment_outbox
            SET state = 'pending', lease_token = NULL, lease_expires_at = NULL, updated_at = now()
          WHERE id = $1 AND lease_token = $2`,
        [claimedWork.id, claimedWork.leaseToken]
      )

      throw error
    }

    work = await claimWork(payload)
  }

  return dispatched
}
