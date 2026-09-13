import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { createSubmissionInputSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import { assessmentError } from '@/server/assessment/response'
import { getAnonymousSession } from '@/server/assessment/session'

export const POST = async (request: Request) => {
  const origin = request.headers.get('origin')

  if (origin !== new URL(request.url).origin) {
    return assessmentError('unauthorized', 'Invalid request origin', 403)
  }

  const parsed = createSubmissionInputSchema.safeParse(await request.json())

  if (!parsed.success) {
    return assessmentError('bad_request', 'Invalid submission request', 400)
  }

  const payload = await getPayload({ config })

  const session = await getAnonymousSession({
    payload,
    sessionToken: request.headers
      .get('cookie')
      ?.match(/(?:^|; )assessment_session=([^;]+)/)?.[1],
  })

  if (!session) {
    return assessmentError(
      'unauthorized',
      'Assessment session is required',
      401
    )
  }

  const questionnaires = await payload.find({
    collection: 'questionnaires',
    where: { publicId: { equals: parsed.data.questionnaireId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const questionnaire = questionnaires.docs[0]

  const versionID =
    typeof questionnaire?.currentPublishedVersion === 'number'
      ? questionnaire.currentPublishedVersion
      : null

  if (!questionnaire || !versionID) {
    return assessmentError('not_found', 'Questionnaire not found', 404)
  }

  const version = await payload.findByID({
    collection: 'questionnaire-versions',
    id: versionID,
    depth: 0,
    overrideAccess: true,
  })

  if (String(version.id) !== parsed.data.displayedVersionId) {
    return assessmentError('stale_revision', 'Questionnaire has changed', 409)
  }

  const submission = await payload.create({
    collection: 'submissions',
    data: {
      externalId: randomUUID(),
      session: session.id,
      questionnaireVersion: version.id,
      state: 'in_progress',
      revision: 0,
      currentStep: 0,
    },
    overrideAccess: true,
  })

  return NextResponse.json(
    {
      submissionId: submission.externalId,
      questionnaireId: questionnaire.publicId,
      versionId: String(version.id),
      revision: submission.revision,
      currentStep: submission.currentStep,
      state: submission.state,
      answers: {},
    },
    { headers: { 'Cache-Control': 'no-store' }, status: 201 }
  )
}
