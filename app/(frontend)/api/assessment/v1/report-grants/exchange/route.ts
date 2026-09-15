import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

import config from '@/payload.config'
import { hashReportGrantSecret } from '@/server/notifications/reportGrants'
import {
  assessmentError,
  parseAssessmentJson,
  withAssessmentErrorBoundary,
} from '@/server/assessment/response'

const inputSchema = z.object({ token: z.string().min(32).max(256) }).strict()
const REPORT_SESSION_COOKIE = 'assessment_report'

export const POST = withAssessmentErrorBoundary(
  '/report-grants/exchange',
  async (request: Request) => {
    const input = inputSchema.safeParse(await parseAssessmentJson(request))

    if (!input.success) {
      return assessmentError('bad_request', 'Invalid report link', 400)
    }

    const payload = await getPayload({ config })
    const client = await payload.db.pool.connect()

    try {
      await client.query('BEGIN')

      const grant = await client.query<{
        session_token_hash: string
      }>(
        `UPDATE report_grants
          SET exchanged_at = now(),
              session_expires_at = now() + interval '24 hours',
              updated_at = now()
        WHERE token_hash = $1 AND exchanged_at IS NULL AND expires_at > now()
        RETURNING session_token_hash`,
        [hashReportGrantSecret(input.data.token)]
      )
      const row = grant.rows[0]

      if (!row) {
        await client.query('ROLLBACK')

        return assessmentError(
          'not_found',
          'Report link is invalid or expired',
          404
        )
      }

      await client.query('COMMIT')

      // The session secret is deliberately derived from the single-use link token
      // only at exchange time, so email scanners performing a GET cannot consume it.
      const response = NextResponse.json(
        { accepted: true },
        { headers: { 'Cache-Control': 'no-store' } }
      )

      response.cookies.set(REPORT_SESSION_COOKIE, input.data.token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24,
        path: '/api/assessment/v1/report-grants',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })

      return response
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }
)
