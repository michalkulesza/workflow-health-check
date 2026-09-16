import {
  assessmentError,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'
import { getPublicLanding } from '@/server/content/publicLanding'

export const GET = withAssessmentErrorBoundary('/landing', async () => {
  const landing = await getPublicLanding()

  if (!landing) {
    return assessmentError('not_found', 'Landing page is not available', 404)
  }

  return Response.json(landing, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
})
