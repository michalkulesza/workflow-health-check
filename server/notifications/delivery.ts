import type { PoolClient } from 'pg'

export const enqueueReportNotificationDeliveries = async ({
  client,
  runID,
}: {
  client: PoolClient
  runID: number
}): Promise<void> => {
  const deliveries = await client.query<{ id: number }>(
    `INSERT INTO email_deliveries
      (notification_request_id, submission_id, scoring_run_id, purpose, email, state, idempotency_key, updated_at, created_at)
     SELECT requests.id, runs.submission_id, runs.id, requests.purpose, requests.email,
            'pending', 'report-ready:' || requests.id || ':' || runs.id, now(), now()
       FROM notification_requests requests
       JOIN scoring_runs runs ON runs.submission_id = requests.submission_id
      WHERE runs.id = $1
     ON CONFLICT (notification_request_id, scoring_run_id, purpose) DO NOTHING
     RETURNING id`,
    [runID]
  )

  for (const delivery of deliveries.rows) {
    await client.query(
      `INSERT INTO assessment_outbox
        (work_key, type, payload, state, attempts, updated_at, created_at)
       VALUES ($1, 'report_email', $2::jsonb, 'pending', 0, now(), now())
       ON CONFLICT (work_key) DO NOTHING`,
      [
        `report-email:${delivery.id}`,
        JSON.stringify({ deliveryID: delivery.id }),
      ]
    )
  }
}
