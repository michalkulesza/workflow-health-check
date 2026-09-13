import { describe, expect, it, vi } from 'vitest'

import { runNarrative } from './narrativeTask'

const definition = {
  schemaVersion: 1,
  categories: [
    {
      key: 'delivery',
      label: 'Delivery',
      order: 0,
      scored: true,
      maxPoints: 20,
      attentionThreshold: 0.6,
      minimumCoverage: 0.6,
    },
  ],
  questions: [
    {
      key: 'q1',
      number: 1,
      categoryKey: 'delivery',
      prompt: 'What goes wrong?',
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
      key: 'delivery-rubric',
      categoryKey: 'delivery',
      evaluationQuestionKeys: ['q1'],
      contextQuestionKeys: [],
      rubricVersion: 'v1',
      promptVersion: 'v1',
      model: 'test',
      weight: 1,
      levels: [1, 2, 3, 4, 5].map((level) => ({
        level,
        description: `Level ${level}`,
      })),
    },
  ],
}

describe('narrative worker', () => {
  it('persists only an eligible, evidence-grounded narrative', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.startsWith('SELECT answer_snapshot')) {
        return {
          rows: [
            {
              answer_snapshot: {
                q1: {
                  state: 'answered',
                  selectedOptionKeys: [],
                  text: 'Project changes are missed in messages.',
                  optionText: {},
                },
              },
              definition_snapshot: definition,
            },
          ],
        }
      }

      if (statement.startsWith('SELECT category_key')) {
        return {
          rows: [{ category_key: 'delivery', points: 8, eligible: true }],
        }
      }

      return { rows: [] }
    })

    const narrate = vi.fn(async () => ({
      summary: 'Delivery is affected by missed changes.',
      priorities: [
        {
          categoryKey: 'delivery',
          explanation: 'Changes are missed in messages.',
          firstStep: 'Record changes in one shared place.',
          evidence: [{ questionKey: 'q1', excerpt: 'missed in messages' }],
        },
      ],
    }))

    await runNarrative({
      outboxID: 3,
      payload: {
        db: { pool: { connect: async () => ({ query, release: vi.fn() }) } },
      } as never,
      provider: { narrate },
      runID: 7,
    })

    expect(narrate).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [
          expect.objectContaining({ categoryKey: 'delivery', score: 8 }),
        ],
      })
    )

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report = $2::jsonb'),
      expect.arrayContaining([7])
    )
  })

  it('rejects model evidence not contained in the submission snapshot', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.startsWith('SELECT answer_snapshot')) {
        return {
          rows: [
            {
              answer_snapshot: {
                q1: {
                  state: 'answered',
                  selectedOptionKeys: [],
                  text: 'Only this answer.',
                  optionText: {},
                },
              },
              definition_snapshot: definition,
            },
          ],
        }
      }

      if (statement.startsWith('SELECT category_key')) {
        return {
          rows: [{ category_key: 'delivery', points: 8, eligible: true }],
        }
      }

      return { rows: [] }
    })

    await expect(
      runNarrative({
        outboxID: 3,
        payload: {
          db: { pool: { connect: async () => ({ query, release: vi.fn() }) } },
        } as never,
        provider: {
          narrate: async () => ({
            summary: 'Unsupported claim.',
            priorities: [
              {
                categoryKey: 'delivery',
                explanation: 'Unsupported claim.',
                firstStep: 'Do something.',
                evidence: [{ questionKey: 'q1', excerpt: 'invented' }],
              },
            ],
          }),
        },
        runID: 7,
      })
    ).rejects.toThrow('outside the submitted answers')
  })
})
