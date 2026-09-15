import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  assessmentError,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'
import { relationID, toPublicLanding } from '@/server/content/publicProjection'

export const GET = withAssessmentErrorBoundary('/landing', async () => {
  const payload = await getPayload({ config })

  const landing = await payload.findGlobal({
    slug: 'landing-page',
    depth: 0,
    overrideAccess: true,
  })
  const questionnaireID = relationID(landing.questionnaire)

  if (!questionnaireID) {
    return assessmentError('not_found', 'Landing page is not available', 404)
  }

  const questionnaire = await payload.findByID({
    collection: 'questionnaires',
    id: questionnaireID,
    depth: 0,
    overrideAccess: true,
  })

  return Response.json(
    toPublicLanding({ landing, questionnairePublicID: questionnaire.publicId }),
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  )
})
