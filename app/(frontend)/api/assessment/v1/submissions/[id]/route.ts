import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  assessmentError,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'
import { toSubmissionDTO } from '@/server/assessment/submission'
import {
  getOwnedSubmission,
  getRequestSession,
} from '@/server/assessment/ownership'

type Props = { params: Promise<{ id: string }> }

export const GET = withAssessmentErrorBoundary(
  '/submissions/:id',
  async (request: Request, { params }: Props) => {
    const payload = await getPayload({ config })
    const session = await getRequestSession(payload, request)

    if (!session) {
      return assessmentError(
        'unauthorized',
        'Assessment session is required',
        401
      )
    }

    const { id } = await params

    const submission = await getOwnedSubmission({
      externalID: id,
      payload,
      sessionID: session.id,
    })

    if (!submission) {
      return assessmentError('not_found', 'Assessment not found', 404)
    }

    return Response.json(await toSubmissionDTO({ payload, submission }), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
)
