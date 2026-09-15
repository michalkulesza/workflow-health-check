import { getPayload } from 'payload'

import { reportSchema } from '@/lib/assessment/contracts'
import { pendingReport } from '@/server/assessment/report'
import {
  getOwnedSubmission,
  getRequestSession,
} from '@/server/assessment/ownership'
import {
  assessmentError,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'
import config from '@/payload.config'

type Props = { params: Promise<{ id: string }> }

export const GET = withAssessmentErrorBoundary(
  '/submissions/:id/report',
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

    const run = await payload.db.pool.query<{
      definition_snapshot: { categories?: { key: string }[] }
      report: unknown
      state: string
    }>(
      `SELECT scoring_runs.state, scoring_runs.report, scoring_runs.definition_snapshot
       FROM scoring_runs
      WHERE scoring_runs.submission_id = $1
      ORDER BY scoring_runs.run_number DESC LIMIT 1`,
      [submission.id]
    )
    const row = run.rows[0]

    if (!row) {
      return assessmentError(
        'invalid_state',
        'Assessment has not been submitted',
        409
      )
    }

    const report = row.report
      ? reportSchema.parse(row.report)
      : row.state === 'failed'
        ? reportSchema.parse({
            status: 'failed',
            analysisComplete: false,
            priorities: [],
            summary: 'Analysis is unavailable. Your answers were saved.',
            pendingCategories: [],
          })
        : row.state === 'partial'
          ? reportSchema.parse({
              status: 'partial',
              analysisComplete: false,
              priorities: [],
              summary:
                'Some analysis could not be completed from the available evidence.',
              pendingCategories: [],
            })
          : pendingReport(
              row.definition_snapshot.categories?.map(
                (category) => category.key
              ) ?? []
            )

    return Response.json(report, { headers: { 'Cache-Control': 'no-store' } })
  }
)
