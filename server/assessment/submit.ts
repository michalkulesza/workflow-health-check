import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

import type { SubmitSubmissionInput } from '@/lib/assessment/contracts'
import { answerValueSchema } from '@/lib/assessment/contracts'
import { questionnaireDefinitionSchema } from '@/server/content/definition'

type SubmitResult =
  | { kind: 'submitted'; revision: number; runID: number }
  | { kind: 'stale'; revision: number | null }
  | { kind: 'mismatch' }
  | { kind: 'invalid'; fieldErrors: Record<string, string[]> }

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    )
  }

  return value
}

const hash = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')

const currentRevision = async (
  payload: Payload,
  submissionID: number,
  sessionID: number
): Promise<number | null> => {
  const result = await payload.db.pool.query<{ revision: string | number }>(
    'SELECT revision FROM submissions WHERE id = $1 AND session_id = $2',
    [submissionID, sessionID]
  )

  return result.rows[0] ? Number(result.rows[0].revision) : null
}

export const submitAssessmentAtomically = async ({
  input,
  payload,
  sessionID,
  submissionID,
}: {
  input: SubmitSubmissionInput
  payload: Payload
  sessionID: number
  submissionID: number
}): Promise<SubmitResult> => {
  const client = await payload.db.pool.connect()

  const submitPayloadHash = hash({
    expectedRevision: input.expectedRevision,
    mutationId: input.mutationId,
  })

  try {
    await client.query('BEGIN')

    const submission = await client.query<{
      definition: unknown
      questionnaire_version_id: number
      revision: string | number
      state: string
      submit_mutation_id: string | null
      submit_payload_hash: string | null
    }>(
      `SELECT submissions.questionnaire_version_id, submissions.revision,
              submissions.state, submissions.submit_mutation_id,
              submissions.submit_payload_hash, questionnaire_versions.definition
         FROM submissions
         JOIN questionnaire_versions
           ON questionnaire_versions.id = submissions.questionnaire_version_id
        WHERE submissions.id = $1 AND submissions.session_id = $2
        FOR UPDATE`,
      [submissionID, sessionID]
    )
    const row = submission.rows[0]

    if (!row) {
      await client.query('ROLLBACK')

      return { kind: 'stale', revision: null }
    }

    if (row.state !== 'in_progress') {
      const run = await client.query<{ id: number }>(
        'SELECT id FROM scoring_runs WHERE submission_id = $1 ORDER BY run_number DESC LIMIT 1',
        [submissionID]
      )
      await client.query('COMMIT')

      if (
        row.submit_mutation_id === input.mutationId &&
        row.submit_payload_hash === submitPayloadHash &&
        run.rows[0]
      ) {
        return {
          kind: 'submitted',
          revision: Number(row.revision),
          runID: run.rows[0].id,
        }
      }

      return { kind: 'mismatch' }
    }

    if (Number(row.revision) !== input.expectedRevision) {
      await client.query('ROLLBACK')

      return {
        kind: 'stale',
        revision: await currentRevision(payload, submissionID, sessionID),
      }
    }

    const definition = questionnaireDefinitionSchema.parse(row.definition)

    const storedAnswers = await client.query<{
      option_text: unknown
      question_key: string
      selected_option_keys: unknown
      state: unknown
      text: string | null
    }>(
      `SELECT question_key, state, selected_option_keys, text, option_text
         FROM answers WHERE submission_id = $1 ORDER BY question_key`,
      [submissionID]
    )

    const answers = Object.fromEntries(
      storedAnswers.rows.map((answer) => [
        answer.question_key,
        answerValueSchema.parse({
          state: answer.state,
          selectedOptionKeys: answer.selected_option_keys,
          text: answer.text,
          optionText: answer.option_text,
        }),
      ])
    )

    const requiredMissing = definition.questions
      .filter(
        (question) =>
          question.required && answers[question.key]?.state !== 'answered'
      )
      .map((question) => question.key)

    if (requiredMissing.length) {
      await client.query('ROLLBACK')

      return {
        kind: 'invalid',
        fieldErrors: {
          answers: requiredMissing.map((key) => `${key} is required`),
        },
      }
    }

    const answerSnapshotHash = hash(answers)

    const run = await client.query<{ id: number }>(
      `INSERT INTO scoring_runs
        (submission_id, questionnaire_version_id, run_number, state, answer_snapshot,
         answer_snapshot_hash, definition_snapshot, engine_version, updated_at, created_at)
       VALUES ($1, $2, 1, 'queued', $3::jsonb, $4, $5::jsonb, 'deterministic-v1', now(), now())
       RETURNING id`,
      [
        submissionID,
        row.questionnaire_version_id,
        JSON.stringify(answers),
        answerSnapshotHash,
        JSON.stringify(definition),
      ]
    )
    const runID = run.rows[0]?.id

    if (!runID) {
      throw new Error('Scoring run insert did not return an ID')
    }

    await client.query(
      `INSERT INTO assessment_outbox
        (work_key, type, payload, state, attempts, updated_at, created_at)
       VALUES ($1, 'deterministic_score', $2::jsonb, 'pending', 0, now(), now())`,
      [`deterministic-score:${runID}`, JSON.stringify({ runID })]
    )

    const updated = await client.query<{ revision: string | number }>(
      `UPDATE submissions
          SET state = 'submitted', revision = revision + 1,
              submitted_snapshot = $1::jsonb, submitted_snapshot_hash = $2,
              submit_mutation_id = $3, submit_payload_hash = $4, updated_at = now()
        WHERE id = $5 RETURNING revision`,
      [
        JSON.stringify(answers),
        answerSnapshotHash,
        input.mutationId,
        submitPayloadHash,
        submissionID,
      ]
    )

    await client.query('COMMIT')

    return {
      kind: 'submitted',
      revision: Number(updated.rows[0]?.revision),
      runID,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
