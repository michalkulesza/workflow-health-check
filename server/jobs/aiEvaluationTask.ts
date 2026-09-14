import type { Payload, TaskConfig } from 'payload'

import { answerValueSchema } from '@/lib/assessment/contracts'
import { createGeminiProvider, type GeminiProvider } from '@/server/ai/gemini'
import {
  type QuestionnaireDefinition,
  questionnaireDefinitionSchema,
} from '@/server/content/definition'

const textForAnswer = (
  answer: ReturnType<typeof answerValueSchema.parse>,
  question: QuestionnaireDefinition['questions'][number]
): string | null => {
  if (answer.state !== 'answered') {
    return null
  }

  if (answer.text) {
    return answer.text
  }

  const labels = answer.selectedOptionKeys.map(
    (key) => question.options.find((option) => option.key === key)?.label ?? key
  )

  return labels.length ? labels.join('; ') : null
}

const validateEvidence = (
  evidence: { questionKey: string; excerpt: string }[],
  permitted: Map<string, string>
) =>
  evidence.every(({ questionKey, excerpt }) =>
    permitted.get(questionKey)?.includes(excerpt)
  )

export const runAIEvaluation = async ({
  outboxID,
  payload,
  provider = createGeminiProvider(),
  runID,
}: {
  outboxID: number
  payload: Payload
  provider?: GeminiProvider
  runID: number
}): Promise<void> => {
  const client = await payload.db.pool.connect()

  try {
    const run = await client.query<{
      answer_snapshot: Record<string, unknown>
      definition_snapshot: unknown
    }>(
      'SELECT answer_snapshot, definition_snapshot FROM scoring_runs WHERE id = $1',
      [runID]
    )
    const row = run.rows[0]

    if (!row) {
      throw new Error(`Scoring run ${runID} does not exist`)
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

    for (const evaluation of definition.aiEvaluations) {
      const existing = await client.query<{
        clarification_response: string | null
        state: string
      }>(
        'SELECT state, clarification_response FROM scoring_ai_evaluations WHERE scoring_run_id = $1 AND evaluation_key = $2',
        [runID, evaluation.key]
      )

      if (
        existing.rows[0]?.state === 'complete' ||
        existing.rows[0]?.state === 'insufficient'
      ) {
        continue
      }

      const questionKeys = [
        ...evaluation.evaluationQuestionKeys,
        ...evaluation.contextQuestionKeys,
      ]

      const questions = new Map(
        definition.questions.map((question) => [question.key, question])
      )

      const permitted = new Map(
        questionKeys
          .map((key) => {
            const question = questions.get(key)
            const answer = answers[key]

            return [
              key,
              question && answer ? textForAnswer(answer, question) : null,
            ]
          })
          .filter((entry): entry is [string, string] => entry[1] !== null)
      )

      if (existing.rows[0]?.clarification_response) {
        permitted.set(
          `clarification-${evaluation.key}`,
          existing.rows[0].clarification_response
        )
      }

      const output = await provider.evaluate({
        model: evaluation.model,
        promptVersion: evaluation.promptVersion,
        rubricVersion: evaluation.rubricVersion,
        levels: evaluation.levels,
        answers: [...permitted].map(([questionKey, answer]) => ({
          questionKey,
          answer,
          prompt: questions.get(questionKey)?.prompt ?? questionKey,
        })),
      })

      if (!validateEvidence(output.evidence, permitted)) {
        throw new Error(
          'AI output cited evidence outside the submitted answers'
        )
      }

      const needsClarification =
        output.insufficientInformation &&
        output.followUpQuestion !== null &&
        !existing.rows[0]?.clarification_response

      await client.query(
        `INSERT INTO scoring_ai_evaluations (scoring_run_id, evaluation_key, state, output, clarification_prompt, attempts, updated_at, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5, 1, now(), now())
         ON CONFLICT (scoring_run_id, evaluation_key) DO UPDATE SET state = EXCLUDED.state, output = EXCLUDED.output,
           clarification_prompt = EXCLUDED.clarification_prompt, attempts = scoring_ai_evaluations.attempts + 1, updated_at = now()`,
        [
          runID,
          evaluation.key,
          needsClarification
            ? 'waiting_for_input'
            : output.insufficientInformation
              ? 'insufficient'
              : 'complete',
          JSON.stringify(output),
          needsClarification ? output.followUpQuestion : null,
        ]
      )
    }

    const waiting = await client.query(
      "SELECT 1 FROM scoring_ai_evaluations WHERE scoring_run_id = $1 AND state = 'waiting_for_input' LIMIT 1",
      [runID]
    )

    await client.query(
      `UPDATE scoring_runs SET state = $2, updated_at = now() WHERE id = $1`,
      [runID, waiting.rowCount ? 'waiting_for_input' : 'deterministic_done']
    )

    if (!waiting.rowCount) {
      await client.query(
        `INSERT INTO assessment_outbox
          (work_key, type, payload, state, attempts, updated_at, created_at)
         VALUES ($1, 'category_aggregation', $2::jsonb, 'pending', 0, now(), now())
         ON CONFLICT (work_key) DO NOTHING`,
        [`category-aggregation:${runID}`, JSON.stringify({ runID })]
      )
    }

    await client.query(
      `UPDATE submissions SET state = $2, updated_at = now() WHERE id = (SELECT submission_id FROM scoring_runs WHERE id = $1) AND state IN ('submitted', 'processing', 'awaiting_clarification')`,
      [runID, waiting.rowCount ? 'awaiting_clarification' : 'ready']
    )

    await client.query(
      `UPDATE assessment_outbox SET state = 'completed', updated_at = now() WHERE id = $1`,
      [outboxID]
    )
  } finally {
    client.release()
  }
}

export const aiEvaluationTask: TaskConfig<{
  input: { outboxID: number; runID: number }
  output: { runID: number }
}> = {
  slug: 'ai-evaluation',
  inputSchema: [
    { name: 'outboxID', type: 'number', required: true },
    { name: 'runID', type: 'number', required: true },
  ],
  outputSchema: [{ name: 'runID', type: 'number', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    await runAIEvaluation({ ...input, payload: req.payload })

    return { output: { runID: input.runID } }
  },
}
