import { describe, expect, it, vi } from 'vitest'

import type { ContactRequest } from '@/lib/assessment/contracts'

import { captureLead, type LeadCaptureClient } from './capture'

const INPUT: ContactRequest = {
  submissionId: 'a82fd5b4-c92f-4d3c-a3a1-97ff8b7f2c52',
  email: 'owner@example.test',
  name: 'Avery Owner',
  message: 'Please help us improve our workflow.',
  idempotencyKey: 'd714b17b-11af-4d9a-8d32-d9a487e38b85',
}

const clientWith = (...rows: unknown[][]): LeadCaptureClient => {
  const query = vi.fn()

  for (const nextRows of rows) {
    query.mockResolvedValueOnce({ rows: nextRows })
  }

  return { query }
}

describe('captureLead', () => {
  it('creates one New lead linked to the latest scoring run', async () => {
    const client = clientWith(
      [{ id: 8 }],
      [{ capture_mutation_id: INPUT.idempotencyKey }]
    )

    await expect(
      captureLead({ client, input: INPUT, submissionID: 4 })
    ).resolves.toEqual({ accepted: true })

    expect(client.query).toHaveBeenCalledTimes(2)

    expect(client.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO leads'),
      expect.arrayContaining([4, 8, INPUT.idempotencyKey])
    )
  })

  it('accepts a retry with the original mutation and payload', async () => {
    let savedHash = ''
    const query = vi.fn()

    query.mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.includes('SELECT id FROM scoring_runs')) {
        return { rows: [{ id: 8 }] }
      }

      if (sql.includes('INSERT INTO leads')) {
        savedHash = String(values[7])

        return { rows: [] }
      }

      return {
        rows: [
          {
            capture_mutation_id: INPUT.idempotencyKey,
            capture_payload_hash: savedHash,
          },
        ],
      }
    })

    const client: LeadCaptureClient = { query }

    await expect(
      captureLead({ client, input: INPUT, submissionID: 4 })
    ).resolves.toEqual({ accepted: true })
  })

  it('rejects a second, different contact request for the submission', async () => {
    const client = clientWith(
      [{ id: 8 }],
      [],
      [
        {
          capture_mutation_id: 'another-id',
          capture_payload_hash: 'another-hash',
        },
      ]
    )

    await expect(
      captureLead({ client, input: INPUT, submissionID: 4 })
    ).resolves.toEqual({ mismatch: true })
  })
})
