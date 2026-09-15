import { getPayload } from 'payload'

import { notificationRequestSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import { enqueueReportNotificationDeliveries } from '@/server/notifications/delivery'
import {
  getOwnedSubmission,
  getRequestSession,
  isAuthorizedWrite,
} from '@/server/assessment/ownership'
import {
  assessmentError,
  parseAssessmentJson,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'

type Props = { params: Promise<{ id: string }> }

export const POST = withAssessmentErrorBoundary(
  '/submissions/:id/notification',
  async (request: Request, { params }: Props) => {
    const payload = await getPayload({ config })
    const session = await getRequestSession(payload, request)

    if (
      !session ||
      !isAuthorizedWrite({ request, csrfTokenHash: session.csrfTokenHash })
    ) {
      return assessmentError(
        'unauthorized',
        'Assessment session is required',
        401
      )
    }

    const { id } = await params

    const input = notificationRequestSchema.safeParse(
      await parseAssessmentJson(request)
    )

    if (!input.success || input.data.submissionId !== id) {
      return assessmentError('bad_request', 'Invalid notification request', 400)
    }

    const submission = await getOwnedSubmission({
      externalID: id,
      payload,
      sessionID: session.id,
    })

    if (!submission) {
      return assessmentError('not_found', 'Assessment not found', 404)
    }

    const client = await payload.db.pool.connect()

    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO notification_requests
        (submission_id, purpose, email, updated_at, created_at)
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (submission_id, purpose) DO UPDATE
         SET email = EXCLUDED.email, updated_at = now()`,
        [submission.id, input.data.purpose, input.data.email]
      )

      const run = await client.query<{ id: number }>(
        `SELECT id FROM scoring_runs
        WHERE submission_id = $1 AND state = 'complete'
        ORDER BY run_number DESC LIMIT 1`,
        [submission.id]
      )

      if (run.rows[0]) {
        await enqueueReportNotificationDeliveries({
          client,
          runID: run.rows[0].id,
        })
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return Response.json(
      { accepted: true },
      { headers: { 'Cache-Control': 'no-store' }, status: 202 }
    )
  }
)
