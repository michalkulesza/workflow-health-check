import { getPayload } from 'payload'

import { answerMutationInputSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import { validateAnswer } from '@/server/assessment/answerValidation'
import { updateAnswerAtomically } from '@/server/assessment/mutations'
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
import { questionnaireDefinitionSchema } from '@/server/content/definition'

type Props = { params: Promise<{ id: string; questionKey: string }> }

export const PUT = withAssessmentErrorBoundary(
  '/submissions/:id/answers/:questionKey',
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

    const { id, questionKey } = await params

    const input = answerMutationInputSchema.safeParse(
      await parseAssessmentJson(request)
    )

    if (
      !input.success ||
      input.data.submissionId !== id ||
      input.data.questionKey !== questionKey
    ) {
      return assessmentError('bad_request', 'Invalid answer request', 400)
    }

    const submission = await getOwnedSubmission({
      externalID: id,
      payload,
      sessionID: session.id,
    })

    if (!submission) {
      return assessmentError('not_found', 'Assessment not found', 404)
    }

    const versionID =
      typeof submission.questionnaireVersion === 'number'
        ? submission.questionnaireVersion
        : submission.questionnaireVersion.id

    const version = await payload.findByID({
      collection: 'questionnaire-versions',
      id: versionID,
      depth: 0,
      overrideAccess: true,
    })

    const fieldErrors = validateAnswer({
      answer: input.data.answer,
      definition: questionnaireDefinitionSchema.parse(version.definition),
      questionKey,
    })

    if (fieldErrors.length) {
      return assessmentError(
        'validation_failed',
        'Answer does not match this questionnaire',
        422,
        undefined,
        { answer: fieldErrors }
      )
    }

    const result = await updateAnswerAtomically({
      input: input.data,
      payload,
      sessionID: session.id,
      submissionID: submission.id,
    })

    if ('mismatch' in result) {
      return assessmentError(
        'idempotency_mismatch',
        'Mutation ID was already used for different data',
        409
      )
    }

    if ('stale' in result) {
      return assessmentError(
        'stale_revision',
        'Assessment has changed in another tab',
        409,
        result.revision ?? undefined
      )
    }

    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  }
)
