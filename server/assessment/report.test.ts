import { describe, expect, it } from 'vitest'

import { questionnaireDefinitionSchema } from '@/server/content/definition'

import { aggregateCategories, noMajorIssuesReport } from './report'

const definition = questionnaireDefinitionSchema.parse({
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
    {
      key: 'creative',
      label: 'Creative',
      order: 1,
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
      prompt: 'Delivery',
      type: 'single',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [{ key: 'yes', label: 'Yes', value: 1 }],
      scoring: { strategy: 'single_choice_value', weight: 1 },
    },
    {
      key: 'q2',
      number: 2,
      categoryKey: 'creative',
      prompt: 'Creative',
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
      key: 'creative-rubric',
      categoryKey: 'creative',
      evaluationQuestionKeys: ['q2'],
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
})

describe('category report aggregation', () => {
  it('uses configured coverage and strict eligibility across deterministic and AI units', () => {
    const categories = aggregateCategories({
      definition,
      results: [
        {
          categoryKey: 'delivery',
          components: [{ questionKey: 'q1', score: 0.5, weight: 1 }],
        },
      ],
      evaluations: [
        {
          evaluationKey: 'creative-rubric',
          state: 'complete',
          output: { score: 0.5 },
        },
      ],
    })

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryKey: 'delivery',
          eligible: true,
          points: 10,
        }),
        expect.objectContaining({
          categoryKey: 'creative',
          eligible: true,
          points: 10,
        }),
      ])
    )
  })

  it('does not invent a priority when all eligible-category checks fail', () => {
    expect(noMajorIssuesReport()).toMatchObject({
      status: 'complete',
      analysisComplete: true,
      priorities: [],
    })
  })
})
