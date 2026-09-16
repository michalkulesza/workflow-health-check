import { getPayload } from 'payload'

import type { Landing } from '@/lib/assessment/contracts'
import config from '@/payload.config'

import { relationID, toPublicLanding } from './publicProjection'

export const getPublicLanding = async (): Promise<Landing | null> => {
  const payload = await getPayload({ config })

  const landing = await payload.findGlobal({
    slug: 'landing-page',
    depth: 0,
    overrideAccess: true,
  })
  const questionnaireID = relationID(landing.questionnaire)

  if (!questionnaireID) {
    return null
  }

  const questionnaire = await payload.findByID({
    collection: 'questionnaires',
    id: questionnaireID,
    depth: 0,
    overrideAccess: true,
  })

  return toPublicLanding({
    landing,
    questionnairePublicID: questionnaire.publicId,
  })
}
