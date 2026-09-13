import { getPayload } from 'payload'

import { submitSubmissionInputSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import {
  getOwnedSubmission,
  getRequestSession,
  isAuthorizedWrite,
} from '@/server/assessment/ownership'
import { assessmentError } from '@/server/assessment/response'
import { submitAssessmentAtomically } from '@/server/assessment/submit'

type Props = { params: Promise<{ id: string }> }

export const POST = async (request: Request, { params }: Props) => {
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
  const input = submitSubmissionInputSchema.safeParse(await request.json())

  if (!input.success || input.data.submissionId !== id) {
    return assessmentError('bad_request', 'Invalid submission request', 400)
  }

  const submission = await getOwnedSubmission({
    externalID: id,
    payload,
    sessionID: session.id,
  })

  if (!submission) {
    return assessmentError('not_found', 'Assessment not found', 404)
  }

  const result = await submitAssessmentAtomically({
    input: input.data,
    payload,
    sessionID: session.id,
    submissionID: submission.id,
  })

  if (result.kind === 'invalid') {
    return assessmentError(
      'validation_failed',
      'Complete required answers before submitting',
      422,
      undefined,
      result.fieldErrors
    )
  }

  if (result.kind === 'stale') {
    return assessmentError(
      'stale_revision',
      'Assessment has changed in another tab',
      409,
      result.revision ?? undefined
    )
  }

  if (result.kind === 'mismatch') {
    return assessmentError(
      'idempotency_mismatch',
      'Submission was already finalized',
      409
    )
  }

  return Response.json(
    {
      revision: result.revision,
      runId: String(result.runID),
      state: 'submitted',
    },
    { headers: { 'Cache-Control': 'no-store' }, status: 202 }
  )
}
