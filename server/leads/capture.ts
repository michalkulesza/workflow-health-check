import { createHash } from 'node:crypto'

import type { ContactRequest } from '@/lib/assessment/contracts'

export interface LeadCaptureClient {
  query: <T>(query: string, values: unknown[]) => Promise<{ rows: T[] }>
}

const captureHash = (input: ContactRequest): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        email: input.email,
        message: input.message,
        name: input.name,
      })
    )
    .digest('hex')

export const captureLead = async ({
  client,
  input,
  submissionID,
}: {
  client: LeadCaptureClient
  input: ContactRequest
  submissionID: number
}): Promise<{ mismatch: true } | { accepted: true }> => {
  const payloadHash = captureHash(input)

  const run = await client.query<{ id: number }>(
    'SELECT id FROM scoring_runs WHERE submission_id = $1 ORDER BY run_number DESC LIMIT 1',
    [submissionID]
  )

  const result = await client.query<{
    capture_mutation_id: string
    capture_payload_hash: string
  }>(
    `INSERT INTO leads (submission_id, scoring_run_id, email, name, message, stage, notes, stage_history, capture_mutation_id, capture_payload_hash, updated_at, created_at)
     VALUES ($1, $2, $3, $4, $5, 'new', '', $6::jsonb, $7, $8, now(), now())
     ON CONFLICT (submission_id) DO NOTHING
     RETURNING capture_mutation_id, capture_payload_hash`,
    [
      submissionID,
      run.rows[0]?.id ?? null,
      input.email,
      input.name,
      input.message,
      JSON.stringify([
        { from: null, to: 'new', changedAt: new Date().toISOString() },
      ]),
      input.idempotencyKey,
      payloadHash,
    ]
  )

  if (result.rows[0]) {
    return { accepted: true }
  }

  const existing = await client.query<{
    capture_mutation_id: string
    capture_payload_hash: string
  }>(
    'SELECT capture_mutation_id, capture_payload_hash FROM leads WHERE submission_id = $1 FOR UPDATE',
    [submissionID]
  )
  const lead = existing.rows[0]

  return lead && lead.capture_payload_hash === payloadHash
    ? { accepted: true }
    : { mismatch: true }
}
