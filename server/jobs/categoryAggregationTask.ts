import type { TaskConfig } from 'payload'

import {
  aggregateCategories,
  noMajorIssuesReport,
} from '@/server/assessment/report'
import { questionnaireDefinitionSchema } from '@/server/content/definition'

export const categoryAggregationTask: TaskConfig<{
  input: { outboxID: number; runID: number }
  output: { runID: number }
}> = {
  slug: 'category-aggregation',
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

      const run = await client.query<{ definition_snapshot: unknown }>(
        'SELECT definition_snapshot FROM scoring_runs WHERE id = $1 FOR UPDATE',
        [input.runID]
      )
      const row = run.rows[0]

      if (!row) {
        throw new Error(`Scoring run ${input.runID} does not exist`)
      }

      const definition = questionnaireDefinitionSchema.parse(
        row.definition_snapshot
      )

      const resultRows = await client.query<{
        category_key: string
        components: {
          questionKey: string
          score: number | null | 'na'
          weight: number
        }[]
      }>(
        'SELECT category_key, components FROM scoring_results WHERE scoring_run_id = $1',
        [input.runID]
      )

      const evaluationRows = await client.query<{
        evaluation_key: string
        output: { score: number | null } | null
        state: 'complete' | 'insufficient' | 'waiting_for_input' | 'pending'
      }>(
        'SELECT evaluation_key, state, output FROM scoring_ai_evaluations WHERE scoring_run_id = $1',
        [input.runID]
      )

      const categories = aggregateCategories({
        definition,
        results: resultRows.rows.map((result) => ({
          categoryKey: result.category_key,
          components: result.components,
        })),
        evaluations: evaluationRows.rows.map((evaluation) => ({
          evaluationKey: evaluation.evaluation_key,
          state: evaluation.state,
          output: evaluation.output,
        })),
      })

      for (const category of categories) {
        await client.query(
          `INSERT INTO scoring_results
            (scoring_run_id, category_key, normalized, points, coverage, eligible,
             components, updated_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now(), now())
           ON CONFLICT (scoring_run_id, category_key) DO UPDATE SET
             normalized = EXCLUDED.normalized, points = EXCLUDED.points,
             coverage = EXCLUDED.coverage, eligible = EXCLUDED.eligible,
             components = EXCLUDED.components, updated_at = now()`,
          [
            input.runID,
            category.categoryKey,
            category.normalized,
            category.points,
            category.coverage,
            category.eligible,
            JSON.stringify(category.components),
          ]
        )
      }

      const eligible = categories.filter((category) => category.eligible)

      if (eligible.length === 0) {
        await client.query(
          `UPDATE scoring_runs SET state = 'complete', report = $2::jsonb, updated_at = now()
            WHERE id = $1`,
          [input.runID, JSON.stringify(noMajorIssuesReport())]
        )

        await client.query(
          `UPDATE submissions SET state = 'ready', updated_at = now()
            WHERE id = (SELECT submission_id FROM scoring_runs WHERE id = $1)`,
          [input.runID]
        )
      } else {
        await client.query(
          `INSERT INTO assessment_outbox
            (work_key, type, payload, state, attempts, updated_at, created_at)
           VALUES ($1, 'narrative', $2::jsonb, 'pending', 0, now(), now())
           ON CONFLICT (work_key) DO NOTHING`,
          [`narrative:${input.runID}`, JSON.stringify({ runID: input.runID })]
        )
      }

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
