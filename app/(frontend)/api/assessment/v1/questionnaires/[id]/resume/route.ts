import { getPayload } from 'payload'

import config from '@/payload.config'
import { getRequestSession } from '@/server/assessment/ownership'
import { toSubmissionDTO } from '@/server/assessment/submission'

type Props = { params: Promise<{ id: string }> }

export const GET = async (request: Request, { params }: Props) => {
  const payload = await getPayload({ config })
  const session = await getRequestSession(payload, request)

  if (!session) {
    return Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { id } = await params

  const submissions = await payload.find({
    collection: 'submissions',
    where: {
      and: [
        { session: { equals: session.id } },
        {
          state: {
            in: [
              'in_progress',
              'submitted',
              'processing',
              'awaiting_clarification',
              'ready',
              'partial',
              'failed',
            ],
          },
        },
      ],
    },
    sort: '-updatedAt',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  const candidates = await Promise.all(
    submissions.docs.map(async (candidate) =>
      toSubmissionDTO({ payload, submission: candidate })
    )
  )

  const questionnaireCandidates = candidates.filter(
    (candidate) => candidate.questionnaireId === id
  )
  const submission =
    questionnaireCandidates.find(
      (candidate) => candidate.state !== 'in_progress'
    ) ?? questionnaireCandidates[0]

  if (!submission) {
    return Response.json(null, { headers: { 'Cache-Control': 'no-store' } })
  }

  return Response.json(submission, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
