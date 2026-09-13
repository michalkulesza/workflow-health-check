import { getPayload } from 'payload'

import { progressMutationInputSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import {
  getOwnedSubmission,
  getRequestSession,
  isAuthorizedWrite,
} from '@/server/assessment/ownership'
import { assessmentError } from '@/server/assessment/response'
import { updateProgressAtomically } from '@/server/assessment/mutations'
import { toSubmissionDTO } from '@/server/assessment/submission'

type Props = { params: Promise<{ id: string }> }

export const PATCH = async (request: Request, { params }: Props) => {
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
  const input = progressMutationInputSchema.safeParse(await request.json())

  if (!input.success || input.data.submissionId !== id) {
    return assessmentError('bad_request', 'Invalid progress request', 400)
  }

  const submission = await getOwnedSubmission({
    externalID: id,
    payload,
    sessionID: session.id,
  })

  if (!submission) {
    return assessmentError('not_found', 'Assessment not found', 404)
  }

  const updated = await updateProgressAtomically({
    currentStep: input.data.currentStep,
    expectedRevision: input.data.expectedRevision,
    payload,
    sessionID: session.id,
    submissionID: submission.id,
  })

  if ('stale' in updated) {
    return assessmentError(
      'stale_revision',
      'Assessment has changed in another tab',
      409,
      updated.revision ?? undefined
    )
  }

  const refreshed = await getOwnedSubmission({
    externalID: id,
    payload,
    sessionID: session.id,
  })

  if (!refreshed) {
    return assessmentError('not_found', 'Assessment not found', 404)
  }

  return Response.json(
    await toSubmissionDTO({ payload, submission: refreshed }),
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
