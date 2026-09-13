import type { Payload, TaskConfig } from 'payload'

import { createReportGrantSecrets } from '@/server/notifications/reportGrants'
import {
  createResendClient,
  ResendDeliveryError,
  type ResendClient,
} from '@/server/notifications/resend'

const RESEND_IDEMPOTENCY_WINDOW_MS = 1000 * 60 * 60 * 24

const reportEmail = ({ reportURL }: { reportURL: string }) => ({
  subject: 'Your workflow health report is ready',
  html: `<p>Your private workflow health report is ready.</p><p><a href="${reportURL}">Open your report</a></p><p>This link expires in 7 days.</p>`,
})

export const runReportEmail = async ({
  deliveryID,
  outboxID,
  payload,
  resend = createResendClient(),
}: {
  deliveryID: number
  outboxID: number
  payload: Payload
  resend?: ResendClient
}): Promise<void> => {
  const client = await payload.db.pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query<{
      email: string
      expires_at: Date | null
      idempotency_key: string
      last_attempt_at: Date | null
      state: string
    }>(
      `SELECT email, expires_at, idempotency_key, last_attempt_at, state
         FROM email_deliveries WHERE id = $1 FOR UPDATE`,
      [deliveryID]
    )
    const delivery = result.rows[0]

    if (!delivery || ['sent', 'unknown', 'failed'].includes(delivery.state)) {
      await client.query(
        "UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1",
        [outboxID]
      )

      await client.query('COMMIT')

      return
    }

    const secrets = createReportGrantSecrets(deliveryID)
    const origin = process.env.APP_ORIGIN

    if (
      !origin ||
      !process.env.EMAIL_FROM ||
      !process.env.REPORT_TOKEN_PEPPER
    ) {
      throw new ResendDeliveryError(
        'Email delivery configuration is missing',
        false
      )
    }

    await client.query(
      `INSERT INTO report_grants
        (email_delivery_id, token_hash, session_token_hash, expires_at, session_expires_at, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       ON CONFLICT (email_delivery_id) DO NOTHING`,
      [
        deliveryID,
        secrets.tokenHash,
        secrets.sessionTokenHash,
        secrets.expiresAt,
        secrets.sessionExpiresAt,
      ]
    )

    await client.query(
      `UPDATE email_deliveries
          SET state = 'preparing', expires_at = $1, last_attempt_at = now(), updated_at = now()
        WHERE id = $2`,
      [secrets.expiresAt, deliveryID]
    )

    await client.query('COMMIT')

    const email = reportEmail({
      reportURL: `${origin.replace(/\/$/, '')}/report/${secrets.token}`,
    })

    const response = await resend.send({
      ...email,
      from: process.env.EMAIL_FROM,
      to: delivery.email,
      idempotencyKey: delivery.idempotency_key,
    })

    await payload.db.pool.query(
      `UPDATE email_deliveries
          SET state = 'sent', provider_message_id = $1, sent_at = now(), updated_at = now()
        WHERE id = $2`,
      [response.id, deliveryID]
    )

    await payload.db.pool.query(
      "UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1",
      [outboxID]
    )
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)

    if (error instanceof ResendDeliveryError && !error.retryable) {
      await payload.db.pool.query(
        `UPDATE email_deliveries SET state = 'failed', failure_reason = $1, updated_at = now() WHERE id = $2`,
        [error.message, deliveryID]
      )

      await payload.db.pool.query(
        "UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1",
        [outboxID]
      )

      return
    }

    const ambiguous = await payload.db.pool.query<{
      last_attempt_at: Date | null
    }>('SELECT last_attempt_at FROM email_deliveries WHERE id = $1', [
      deliveryID,
    ])
    const lastAttempt = ambiguous.rows[0]?.last_attempt_at

    if (
      lastAttempt &&
      Date.now() - lastAttempt.getTime() >= RESEND_IDEMPOTENCY_WINDOW_MS
    ) {
      await payload.db.pool.query(
        "UPDATE email_deliveries SET state = 'unknown', updated_at = now() WHERE id = $1",
        [deliveryID]
      )

      await payload.db.pool.query(
        "UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1",
        [outboxID]
      )

      return
    }

    throw error
  } finally {
    client.release()
  }
}

export const reportEmailTask: TaskConfig<{
  input: { deliveryID: number; outboxID: number }
  output: { deliveryID: number }
}> = {
  slug: 'report-email',
  inputSchema: [
    { name: 'deliveryID', type: 'number', required: true },
    { name: 'outboxID', type: 'number', required: true },
  ],
  outputSchema: [{ name: 'deliveryID', type: 'number', required: true }],
  retries: 3,
  handler: async ({ input, req }) => {
    await runReportEmail({ ...input, payload: req.payload })

    return { output: { deliveryID: input.deliveryID } }
  },
}
