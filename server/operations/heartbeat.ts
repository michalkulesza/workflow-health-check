import type { Payload } from 'payload'

export const WORKER_HEARTBEAT_MAX_AGE_SECONDS = 90

export const recordWorkerHeartbeat = async (
  payload: Payload
): Promise<void> => {
  await payload.db.pool.query(
    `INSERT INTO runtime_heartbeats (service, last_seen_at, updated_at)
      VALUES ('worker', now(), now())
      ON CONFLICT (service)
      DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, updated_at = now()`
  )
}

export const hasRecentWorkerHeartbeat = async (
  payload: Payload,
  maximumAgeSeconds = WORKER_HEARTBEAT_MAX_AGE_SECONDS
): Promise<boolean> => {
  const result = await payload.db.pool.query<{ is_recent: boolean }>(
    `SELECT last_seen_at >= now() - ($1 * interval '1 second') AS is_recent
       FROM runtime_heartbeats
      WHERE service = 'worker'`,
    [maximumAgeSeconds]
  )

  return result.rows[0]?.is_recent === true
}
