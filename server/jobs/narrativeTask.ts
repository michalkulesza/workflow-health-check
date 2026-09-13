import type { Payload, TaskConfig } from 'payload'

import { answerValueSchema, reportSchema } from '@/lib/assessment/contracts'
import {
  createNarrativeProvider,
  type NarrativeProvider,
} from '@/server/ai/narrative'
import { questionnaireDefinitionSchema } from '@/server/content/definition'

const answerText = (answer: ReturnType<typeof answerValueSchema.parse>) =>
  answer.state === 'answered'
    ? (answer.text ?? answer.selectedOptionKeys.join('; '))
    : null

export const runNarrative = async ({
  outboxID,
  payload,
  provider = createNarrativeProvider(),
  runID,
}: {
  outboxID: number
  payload: Payload
  provider?: NarrativeProvider
  runID: number
}): Promise<void> => {
  const client = await payload.db.pool.connect()

  try {
    await client.query('BEGIN')

    const run = await client.query(
      'SELECT answer_snapshot, definition_snapshot FROM scoring_runs WHERE id = $1 FOR UPDATE',
      [runID]
    )

    const row = run.rows[0] as
      | {
          answer_snapshot: Record<string, unknown>
          definition_snapshot: unknown
        }
      | undefined

    if (!row) {
      throw new Error(`Scoring run ${runID} does not exist`)
    }

    const definition = questionnaireDefinitionSchema.parse(
      row.definition_snapshot
    )

    const results = await client.query(
      'SELECT category_key, points, eligible FROM scoring_results WHERE scoring_run_id = $1',
      [runID]
    )

    const categories = results.rows
      .filter((result: { eligible: boolean }) => result.eligible)
      .map((result: { category_key: string; points: number }) => {
        const category = definition.categories.find(
          (candidate) => candidate.key === result.category_key
        )

        if (!category) {
          throw new Error(`Unknown scored category ${result.category_key}`)
        }

        return {
          categoryKey: category.key,
          categoryLabel: category.label,
          score: result.points,
          maxPoints: category.maxPoints,
        }
      })

    if (!categories.length) {
      throw new Error(`Narrative run ${runID} has no eligible categories`)
    }

    const permitted = new Map(
      Object.entries(row.answer_snapshot)
        .map(
          ([questionKey, value]) =>
            [questionKey, answerText(answerValueSchema.parse(value))] as const
        )
        .filter(
          (entry): entry is readonly [string, string] => entry[1] !== null
        )
    )

    const output = await provider.narrate({
      categories,
      answers: [...permitted].map(([questionKey, answer]) => ({
        questionKey,
        answer,
      })),
    })

    const categoryKeys = new Set(
      categories.map((category) => category.categoryKey)
    )
    const seen = new Set<string>()

    for (const priority of output.priorities) {
      if (
        !categoryKeys.has(priority.categoryKey) ||
        seen.has(priority.categoryKey)
      ) {
        throw new Error('Narrative selected an unknown or duplicate priority')
      }

      if (
        !priority.evidence.every((evidence) =>
          permitted.get(evidence.questionKey)?.includes(evidence.excerpt)
        )
      ) {
        throw new Error(
          'Narrative cited evidence outside the submitted answers'
        )
      }

      seen.add(priority.categoryKey)
    }

    const report = reportSchema.parse({
      status: 'complete',
      analysisComplete: true,
      summary: output.summary,
      priorities: output.priorities.map(
        ({ categoryKey, explanation, firstStep }) => {
          const category = categories.find(
            (candidate) => candidate.categoryKey === categoryKey
          )

          if (!category) {
            throw new Error(`Unknown narrative category ${categoryKey}`)
          }

          return { ...category, explanation, firstStep }
        }
      ),
      pendingCategories: [],
    })

    await client.query(
      `UPDATE scoring_runs SET state = 'complete', report = $2::jsonb, updated_at = now() WHERE id = $1`,
      [runID, JSON.stringify(report)]
    )

    await client.query(
      `UPDATE submissions SET state = 'ready', updated_at = now()
        WHERE id = (SELECT submission_id FROM scoring_runs WHERE id = $1)`,
      [runID]
    )

    await client.query(
      `UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1`,
      [outboxID]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const narrativeTask: TaskConfig<{
  input: { outboxID: number; runID: number }
  output: { runID: number }
}> = {
  slug: 'assessment-narrative',
  inputSchema: [
    { name: 'outboxID', type: 'number', required: true },
    { name: 'runID', type: 'number', required: true },
  ],
  outputSchema: [{ name: 'runID', type: 'number', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    await runNarrative({ ...input, payload: req.payload })

    return { output: { runID: input.runID } }
  },
}
