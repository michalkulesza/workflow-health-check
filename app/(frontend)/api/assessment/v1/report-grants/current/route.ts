import { getPayload } from 'payload'

import { reportSchema } from '@/lib/assessment/contracts'
import config from '@/payload.config'
import { hashReportGrantSecret } from '@/server/notifications/reportGrants'
import { assessmentError } from '@/server/assessment/response'

const REPORT_SESSION_COOKIE = 'assessment_report'

const cookieValue = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1]

export const GET = async (request: Request) => {
  const sessionToken = cookieValue(request, REPORT_SESSION_COOKIE)

  if (!sessionToken) {
    return assessmentError('unauthorized', 'Report access is required', 401)
  }

  const payload = await getPayload({ config })

  const report = await payload.db.pool.query<{ report: unknown }>(
    `SELECT runs.report
       FROM report_grants grants
       JOIN email_deliveries deliveries ON deliveries.id = grants.email_delivery_id
       JOIN scoring_runs runs ON runs.id = deliveries.scoring_run_id
      WHERE grants.session_token_hash = $1
        AND grants.exchanged_at IS NOT NULL
        AND grants.session_expires_at > now()
      LIMIT 1`,
    [hashReportGrantSecret(sessionToken)]
  )
  const row = report.rows[0]

  if (!row || !row.report) {
    return assessmentError('not_found', 'Report is unavailable', 404)
  }

  return Response.json(reportSchema.parse(row.report), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
