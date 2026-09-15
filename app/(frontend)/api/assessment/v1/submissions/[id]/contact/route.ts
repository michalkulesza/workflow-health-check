import { getPayload } from 'payload'

import { contactRequestSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
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
import { captureLead } from '@/server/leads/capture'

type Props = { params: Promise<{ id: string }> }

export const POST = withAssessmentErrorBoundary(
  '/submissions/:id/contact',
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

    const input = contactRequestSchema.safeParse(
      await parseAssessmentJson(request)
    )

    if (!input.success || input.data.submissionId !== id) {
      return assessmentError('bad_request', 'Invalid contact request', 400)
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

      const result = await captureLead({
        client,
        input: input.data,
        submissionID: submission.id,
      })

      if ('mismatch' in result) {
        await client.query('ROLLBACK')

        return assessmentError(
          'idempotency_mismatch',
          'A different contact request was already saved for this assessment',
          409
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
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
