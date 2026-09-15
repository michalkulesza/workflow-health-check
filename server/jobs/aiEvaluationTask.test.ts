import { afterEach, describe, expect, it, vi } from 'vitest'

import { runAIEvaluation } from './aiEvaluationTask'

const definition = {
  schemaVersion: 1,
  categories: [{ key: 'friction', label: 'Friction', order: 0, scored: true }],
  questions: [
    {
      key: 'q11',
      number: 11,
      categoryKey: 'friction',
      prompt: 'What breaks?',
      type: 'text',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [],
      scoring: { strategy: 'ai_rubric', weight: 1 },
    },
  ],
  aiEvaluations: [
    {
      key: 'friction-rubric',
      categoryKey: 'friction',
      evaluationQuestionKeys: ['q11'],
      contextQuestionKeys: [],
      rubricVersion: 'v1',
      promptVersion: 'v1',
      model: 'test-model',
      weight: 1,
      levels: [1, 2, 3, 4, 5].map((level) => ({
        level,
        description: `Level ${level}`,
      })),
    },
  ],
}

describe('AI evaluation worker', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    [undefined, 'test-model'],
    ['', 'test-model'],
    ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite'],
  ])(
    'resolves environment model %s to %s and persists a validated grouped result',
    async (configuredModel, expectedModel) => {
      vi.stubEnv('GEMINI_MODEL', configuredModel)

      const query = vi.fn(async (statement: string) => {
        if (statement.startsWith('SELECT answer_snapshot')) {
          return {
            rows: [
              {
                answer_snapshot: {
                  q11: {
                    state: 'answered',
                    selectedOptionKeys: [],
                    text: 'I lose changes in messages.',
                    optionText: {},
                  },
                },
                definition_snapshot: definition,
              },
            ],
            rowCount: 1,
          }
        }

        if (statement.startsWith('SELECT state, clarification_response')) {
          return { rows: [], rowCount: 0 }
        }

        if (statement.startsWith('SELECT 1 FROM scoring_ai_evaluations')) {
          return { rows: [], rowCount: 0 }
        }

        return { rows: [], rowCount: 1 }
      })
      const release = vi.fn()

      const evaluate = vi.fn(async () => ({
        output: {
          level: 2 as const,
          score: 0.25,
          confidence: 0.8,
          themes: ['messages'],
          explanation: 'Changes are lost in messages.',
          insufficientInformation: false,
          evidence: [{ questionKey: 'q11', excerpt: 'lose changes' }],
          followUpQuestion: null,
        },
        usage: {
          cachedContentTokens: null,
          outputTokens: 8,
          promptTokens: 12,
          reasoningTokens: null,
          totalTokens: 20,
        },
      }))

      const payload = {
        db: { pool: { connect: async () => ({ query, release }) } },
      }

      await runAIEvaluation({
        outboxID: 3,
        payload: payload as never,
        provider: { evaluate },
        runID: 7,
      })

      expect(evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ model: expectedModel })
      )

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scoring_ai_evaluations'),
        expect.arrayContaining([
          7,
          'friction-rubric',
          'complete',
          expect.stringContaining('"totalTokens":20'),
        ])
      )

      expect(release).toHaveBeenCalledOnce()
    }
  )

  it('rejects provider evidence that was not literally supplied by the respondent', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.startsWith('SELECT answer_snapshot')) {
        return {
          rows: [
            {
              answer_snapshot: {
                q11: {
                  state: 'answered',
                  selectedOptionKeys: [],
                  text: 'A short answer.',
                  optionText: {},
                },
              },
              definition_snapshot: definition,
            },
          ],
          rowCount: 1,
        }
      }

      if (statement.startsWith('SELECT state, clarification_response')) {
        return { rows: [], rowCount: 0 }
      }

      return { rows: [], rowCount: 0 }
    })

    const payload = {
      db: { pool: { connect: async () => ({ query, release: vi.fn() }) } },
    }

    await expect(
      runAIEvaluation({
        outboxID: 3,
        payload: payload as never,
        provider: {
          evaluate: async () => ({
            level: 1,
            score: 0,
            confidence: 1,
            themes: ['invented'],
            explanation: 'No.',
            insufficientInformation: false,
            evidence: [{ questionKey: 'q11', excerpt: 'not supplied' }],
            followUpQuestion: null,
          }),
        },
        runID: 7,
      })
    ).rejects.toThrow('outside the submitted answers')
  })
})
