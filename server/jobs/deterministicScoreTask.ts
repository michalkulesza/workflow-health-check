import type { TaskConfig } from 'payload'

import { answerValueSchema } from '@/lib/assessment/contracts'
import { scoreDeterministicCategories } from '@/server/assessment/scoring'
import { questionnaireDefinitionSchema } from '@/server/content/definition'

export const deterministicScoreTask: TaskConfig<{
  input: { outboxID: number; runID: number }
  output: { runID: number }
}> = {
  slug: 'deterministic-score',
  inputSchema: [
    { name: 'outboxID', type: 'number', required: true },
    { name: 'runID', type: 'number', required: true },
  ],
  outputSchema: [{ name: 'runID', type: 'number', required: true }],
  retries: 0,
  handler: async ({ input, req }) => {
    const client = await req.payload.db.pool.connect()

    try {
      await client.query('BEGIN')

      const run = await client.query<{
        answer_snapshot: Record<string, unknown>
        definition_snapshot: unknown
        state: string
      }>(
        `SELECT state, answer_snapshot, definition_snapshot FROM scoring_runs
          WHERE id = $1 FOR UPDATE`,
        [input.runID]
      )
      const row = run.rows[0]

      if (!row) {
        throw new Error(`Scoring run ${input.runID} does not exist`)
      }

      if (
        [
          'deterministic_done',
          'ai_pending',
          'waiting_for_input',
          'complete',
        ].includes(row.state)
      ) {
        await client.query(
          `UPDATE assessment_outbox SET state = 'completed', updated_at = now()
            WHERE id = $1`,
          [input.outboxID]
        )

        await client.query('COMMIT')

        return { output: { runID: input.runID } }
      }

      const definition = questionnaireDefinitionSchema.parse(
        row.definition_snapshot
      )

      const answers = Object.fromEntries(
        Object.entries(row.answer_snapshot).map(([key, answer]) => [
          key,
          answerValueSchema.parse(answer),
        ])
      )
      const scores = scoreDeterministicCategories(definition, answers)

      for (const score of scores) {
        await client.query(
          `INSERT INTO scoring_results
            (scoring_run_id, category_key, normalized, points, coverage, eligible,
             components, updated_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
           ON CONFLICT (scoring_run_id, category_key) DO NOTHING`,
          [
            input.runID,
            score.categoryKey,
            score.normalized,
            score.points,
            score.coverage,
            score.eligible,
            JSON.stringify(score.components),
          ]
        )
      }

      const hasAIEvaluations = definition.aiEvaluations.length > 0

      if (hasAIEvaluations) {
        await client.query(
          `INSERT INTO assessment_outbox
            (work_key, type, payload, state, attempts, updated_at, created_at)
           VALUES ($1, 'ai_evaluation', $2::jsonb, 'pending', 0, now(), now())
           ON CONFLICT (work_key) DO NOTHING`,
          [
            `ai-evaluation:${input.runID}`,
            JSON.stringify({ runID: input.runID }),
          ]
        )
      }

      await client.query(
        `UPDATE scoring_runs SET state = $2, updated_at = now() WHERE id = $1`,
        [input.runID, hasAIEvaluations ? 'ai_pending' : 'deterministic_done']
      )

      await client.query(
        `UPDATE submissions SET state = 'processing', updated_at = now()
          WHERE id = (SELECT submission_id FROM scoring_runs WHERE id = $1)
            AND state IN ('submitted', 'processing')`,
        [input.runID]
      )

      await client.query(
        `UPDATE assessment_outbox SET state = 'completed', updated_at = now()
          WHERE id = $1`,
        [input.outboxID]
      )

      await client.query('COMMIT')

      return { output: { runID: input.runID } }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}
