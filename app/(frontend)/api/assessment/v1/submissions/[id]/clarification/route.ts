import { getPayload } from 'payload'

import { clarificationResponseInputSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
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

type Props = { params: Promise<{ id: string }> }

export const POST = withAssessmentErrorBoundary(
  '/submissions/:id/clarification',
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

    const { id } = await params

    const input = clarificationResponseInputSchema.safeParse(
      await parseAssessmentJson(request)
    )

    if (!input.success || input.data.submissionId !== id) {
      return assessmentError(
        'bad_request',
        'Invalid clarification response',
        400
      )
    }

    const submission = await getOwnedSubmission({
      externalID: id,
      payload,
      sessionID: session.id,
    })

    if (!submission) {
      return assessmentError('not_found', 'Assessment not found', 404)
    }

    const result = await payload.db.pool.query<{ run_id: number }>(
      `UPDATE scoring_ai_evaluations evaluation
       SET state = 'pending', clarification_response = $1, clarification_prompt = NULL, updated_at = now()
      FROM scoring_runs run
     WHERE evaluation.scoring_run_id = run.id AND run.submission_id = $2
       AND evaluation.evaluation_key = $3 AND evaluation.state = 'waiting_for_input'
     RETURNING run.id AS run_id`,
      [input.data.response, submission.id, input.data.evaluationKey]
    )
    const runID = result.rows[0]?.run_id

    if (!runID) {
      return assessmentError(
        'invalid_state',
        'This clarification is no longer awaiting a response',
        409
      )
    }

    await payload.db.pool.query(
      `INSERT INTO assessment_outbox (work_key, type, payload, state, attempts, updated_at, created_at)
     VALUES ($1, 'ai_evaluation', $2::jsonb, 'pending', 0, now(), now())
     ON CONFLICT (work_key) DO UPDATE SET state = 'pending', updated_at = now()`,
      [`ai-evaluation:${runID}`, JSON.stringify({ runID })]
    )

    await payload.db.pool.query(
      "UPDATE scoring_runs SET state = 'ai_pending', updated_at = now() WHERE id = $1",
      [runID]
    )

    await payload.db.pool.query(
      "UPDATE submissions SET state = 'processing', updated_at = now() WHERE id = $1",
      [submission.id]
    )

    return Response.json(
      { state: 'processing' },
      { headers: { 'Cache-Control': 'no-store' }, status: 202 }
    )
  }
)
