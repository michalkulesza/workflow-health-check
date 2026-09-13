import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

import type {
  AnswerMutationInput,
  AnswerValue,
} from '@/lib/assessment/contracts'

const hashPayload = (input: AnswerMutationInput): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        answer: input.answer,
        expectedRevision: input.expectedRevision,
        questionKey: input.questionKey,
      })
    )
    .digest('hex')

const currentRevision = async ({
  payload,
  sessionID,
  submissionID,
}: {
  payload: Payload
  sessionID: number
  submissionID: number
}): Promise<number | null> => {
  const result = await payload.db.pool.query<{ revision: string | number }>(
    'SELECT revision FROM submissions WHERE id = $1 AND session_id = $2',
    [submissionID, sessionID]
  )

  return result.rows[0] ? Number(result.rows[0].revision) : null
}

export const updateProgressAtomically = async ({
  currentStep,
  expectedRevision,
  payload,
  sessionID,
  submissionID,
}: {
  currentStep: number
  expectedRevision: number
  payload: Payload
  sessionID: number
  submissionID: number
}): Promise<
  { revision: number } | { revision: number | null; stale: true }
> => {
  const result = await payload.db.pool.query<{ revision: string | number }>(
    `UPDATE submissions
       SET current_step = $1, revision = revision + 1, updated_at = now()
     WHERE id = $2 AND session_id = $3 AND revision = $4
     RETURNING revision`,
    [currentStep, submissionID, sessionID, expectedRevision]
  )

  if (result.rows[0]) {
    return { revision: Number(result.rows[0].revision) }
  }

  return {
    revision: await currentRevision({ payload, sessionID, submissionID }),
    stale: true,
  }
}

export const updateAnswerAtomically = async ({
  input,
  payload,
  sessionID,
  submissionID,
}: {
  input: AnswerMutationInput
  payload: Payload
  sessionID: number
  submissionID: number
}): Promise<
  | { answer: AnswerValue; revision: number }
  | { revision: number | null; stale: true }
  | { mismatch: true }
> => {
  const client = await payload.db.pool.connect()
  const payloadHash = hashPayload(input)

  try {
    await client.query('BEGIN')

    const mutation = await client.query<{
      payload_hash: string
      result_revision: string | number
    }>(
      `SELECT payload_hash, result_revision
         FROM answer_mutations
        WHERE submission_id = $1 AND mutation_id = $2
        FOR UPDATE`,
      [submissionID, input.mutationId]
    )

    if (mutation.rows[0]) {
      await client.query('COMMIT')

      if (mutation.rows[0].payload_hash !== payloadHash) {
        return { mismatch: true }
      }

      return {
        answer: input.answer,
        revision: Number(mutation.rows[0].result_revision),
      }
    }

    const submission = await client.query<{ revision: string | number }>(
      `UPDATE submissions
         SET revision = revision + 1, updated_at = now()
       WHERE id = $1 AND session_id = $2 AND revision = $3
       RETURNING revision`,
      [submissionID, sessionID, input.expectedRevision]
    )

    if (!submission.rows[0]) {
      await client.query('ROLLBACK')

      return {
        revision: await currentRevision({ payload, sessionID, submissionID }),
        stale: true,
      }
    }

    await client.query(
      `INSERT INTO answers
        (submission_id, question_key, state, selected_option_keys, text, option_text, updated_at, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, now(), now())
       ON CONFLICT (submission_id, question_key)
       DO UPDATE SET state = EXCLUDED.state,
                     selected_option_keys = EXCLUDED.selected_option_keys,
                     text = EXCLUDED.text,
                     option_text = EXCLUDED.option_text,
                     updated_at = now()`,
      [
        submissionID,
        input.questionKey,
        input.answer.state,
        JSON.stringify(input.answer.selectedOptionKeys),
        input.answer.text,
        JSON.stringify(input.answer.optionText),
      ]
    )

    const revision = Number(submission.rows[0].revision)

    await client.query(
      `INSERT INTO answer_mutations
        (submission_id, mutation_id, payload_hash, result_revision, updated_at, created_at)
       VALUES ($1, $2, $3, $4, now(), now())`,
      [submissionID, input.mutationId, payloadHash, revision]
    )

    await client.query('COMMIT')

    return { answer: input.answer, revision }
  } catch (error) {
    await client.query('ROLLBACK')

    throw error
  } finally {
    client.release()
  }
}
