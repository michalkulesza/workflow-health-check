import type { Payload } from 'payload'

const INCOMPLETE_RETENTION_DAYS = 30
const COMPLETED_RETENTION_DAYS = 365

type RetentionResult = {
  expiredSessions: number
  purgedCompletedSubmissions: number
  purgedIncompleteSubmissions: number
}

const selectSubmissionIDs = async (
  payload: Payload,
  states: string[],
  inactiveDays: number,
  requireClosedLead: boolean
): Promise<number[]> => {
  const result = await payload.db.pool.query<{ id: number }>(
    `SELECT submissions.id
       FROM submissions
       LEFT JOIN leads ON leads.submission_id = submissions.id
      WHERE submissions.state = ANY($1::text[])
        AND submissions.updated_at < now() - ($2 * interval '1 day')
        AND ($3 = false OR leads.id IS NULL OR leads.stage = 'closed')`,
    [states, inactiveDays, requireClosedLead]
  )

  return result.rows.map(({ id }) => id)
}

const deleteSubmissions = async (
  payload: Payload,
  submissionIDs: number[]
): Promise<number> => {
  if (submissionIDs.length === 0) {
    return 0
  }

  const client = await payload.db.pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `DELETE FROM payload_jobs
        WHERE id IN (
          SELECT payload_job_id FROM assessment_outbox
          WHERE payload_job_id IS NOT NULL
            AND (
              (payload->>'runID')::integer IN (
                SELECT id FROM scoring_runs WHERE submission_id = ANY($1::integer[])
              )
              OR (payload->>'deliveryID')::integer IN (
                SELECT id FROM email_deliveries WHERE submission_id = ANY($1::integer[])
              )
            )
        )`,
      [submissionIDs]
    )

    await client.query(
      `DELETE FROM assessment_outbox
        WHERE (payload->>'runID')::integer IN (
          SELECT id FROM scoring_runs WHERE submission_id = ANY($1::integer[])
        ) OR (payload->>'deliveryID')::integer IN (
          SELECT id FROM email_deliveries WHERE submission_id = ANY($1::integer[])
        )`,
      [submissionIDs]
    )

    await client.query(
      'DELETE FROM answer_mutations WHERE submission_id = ANY($1::integer[])',
      [submissionIDs]
    )

    await client.query(
      'DELETE FROM answers WHERE submission_id = ANY($1::integer[])',
      [submissionIDs]
    )

    await client.query(
      'DELETE FROM leads WHERE submission_id = ANY($1::integer[])',
      [submissionIDs]
    )

    const deleted = await client.query(
      'DELETE FROM submissions WHERE id = ANY($1::integer[])',
      [submissionIDs]
    )
    await client.query('COMMIT')

    return deleted.rowCount ?? 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const inspectRetention = async (
  payload: Payload
): Promise<RetentionResult> => {
  const [incomplete, completed, sessions] = await Promise.all([
    selectSubmissionIDs(
      payload,
      ['in_progress', 'submitted', 'processing', 'awaiting_clarification'],
      INCOMPLETE_RETENTION_DAYS,
      false
    ),
    selectSubmissionIDs(
      payload,
      ['ready', 'partial', 'failed'],
      COMPLETED_RETENTION_DAYS,
      true
    ),
    payload.db.pool.query(
      'SELECT count(*)::integer AS count FROM anonymous_sessions WHERE expires_at < now()'
    ),
  ])

  return {
    expiredSessions: sessions.rows[0]?.count ?? 0,
    purgedCompletedSubmissions: completed.length,
    purgedIncompleteSubmissions: incomplete.length,
  }
}

export const purgeExpiredPrivateData = async (
  payload: Payload
): Promise<RetentionResult> => {
  const incomplete = await selectSubmissionIDs(
    payload,
    ['in_progress', 'submitted', 'processing', 'awaiting_clarification'],
    INCOMPLETE_RETENTION_DAYS,
    false
  )

  const completed = await selectSubmissionIDs(
    payload,
    ['ready', 'partial', 'failed'],
    COMPLETED_RETENTION_DAYS,
    true
  )

  const [purgedIncompleteSubmissions, purgedCompletedSubmissions] =
    await Promise.all([
      deleteSubmissions(payload, incomplete),
      deleteSubmissions(payload, completed),
    ])

  const sessions = await payload.db.pool.query(
    'DELETE FROM anonymous_sessions WHERE expires_at < now()'
  )

  return {
    expiredSessions: sessions.rowCount ?? 0,
    purgedCompletedSubmissions,
    purgedIncompleteSubmissions,
  }
}
