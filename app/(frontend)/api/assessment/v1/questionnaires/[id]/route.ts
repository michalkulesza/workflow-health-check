import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  assessmentError,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'
import {
  relationID,
  toPublicQuestionnaire,
} from '@/server/content/publicProjection'

type Props = { params: Promise<{ id: string }> }

export const GET = withAssessmentErrorBoundary(
  '/questionnaires/:id',
  async (_request: Request, { params }: Props) => {
    const { id } = await params
    const payload = await getPayload({ config })

    const questionnaires = await payload.find({
      collection: 'questionnaires',
      where: { publicId: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const questionnaire = questionnaires.docs[0]

    const versionID = questionnaire
      ? relationID(questionnaire.currentPublishedVersion)
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

    return Response.json(
      toPublicQuestionnaire({
        questionnaireID: questionnaire.publicId,
        version,
      }),
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  }
)
