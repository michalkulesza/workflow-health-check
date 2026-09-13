import { describe, expect, it } from 'vitest'

import { questionnaireDefinitionSchema } from '@/server/content/definition'

import {
  InvalidScoringAnswerError,
  scoreDeterministicCategories,
  scoreDeterministicQuestion,
} from './scoring'

const definition = questionnaireDefinitionSchema.parse({
  schemaVersion: 1,
  categories: [
    {
      key: 'workflow',
      label: 'Workflow',
      order: 0,
      scored: true,
      maxPoints: 20,
      attentionThreshold: 0.6,
      minimumCoverage: 0.6,
    },
    {
      key: 'other',
      label: 'Other',
      order: 1,
      scored: true,
      maxPoints: 10,
      attentionThreshold: 0.5,
      minimumCoverage: 0.5,
    },
  ],
  questions: [
    {
      key: 'single',
      number: 4,
      categoryKey: 'workflow',
      prompt: 'Single',
      type: 'single',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [
        { key: 'good', label: 'Good', value: 1 },
        { key: 'poor', label: 'Poor', value: 0 },
        { key: 'na', label: 'NA', value: 0, notApplicable: true },
      ],
      scoring: { strategy: 'single_choice_value', weight: 2 },
    },
    {
      key: 'weighted',
      number: 8,
      categoryKey: 'workflow',
      prompt: 'Weighted',
      type: 'multi',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [
        { key: 'issue', label: 'Issue', penalty: 3 },
        { key: 'smooth', label: 'Smooth', exclusive: true },
      ],
      scoring: {
        strategy: 'multi_select_weighted',
        weight: 1,
        penaltyDenominator: 6,
        exclusiveValue: 1,
      },
    },
    {
      key: 'count',
      number: 9,
      categoryKey: 'workflow',
      prompt: 'Count',
      type: 'multi',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [
        { key: 'task', label: 'Task' },
        { key: 'none', label: 'None', exclusive: true },
      ],
      scoring: {
        strategy: 'multi_select_count',
        weight: 1,
        curve: [
          { atLeast: 1, value: 0.9 },
          { atLeast: 2, value: 0 },
        ],
        exclusiveValue: 1,
      },
    },
    {
      key: 'quality',
      number: 5,
      categoryKey: 'other',
      prompt: 'Quality',
      type: 'multi',
      required: true,
      instructions: null,
      maxSelections: null,
      options: [
        { key: 'tool', label: 'Tool', value: 1 },
        { key: 'head', label: 'Head', value: 0 },
      ],
      scoring: {
        strategy: 'multi_select_quality_quantity',
        weight: 1,
        qualityWeight: 0.6,
        quantityWeight: 0.4,
        quantityCurve: [
          { atLeast: 1, value: 1 },
          { atLeast: 2, value: 0 },
        ],
        singletonOverride: { optionKey: 'head', value: 0 },
      },
    },
  ],
})

const answered = (selectedOptionKeys: string[]) => ({
  state: 'answered' as const,
  selectedOptionKeys,
  text: null,
  optionText: {},
})

describe('config-driven deterministic scoring', () => {
  it('uses configured single, weighted, count, and quality/quantity formulas', () => {
    expect(
      scoreDeterministicQuestion(definition.questions[0]!, answered(['poor']))
    ).toBe(0)

    expect(
      scoreDeterministicQuestion(definition.questions[1]!, answered(['issue']))
    ).toBe(0.5)

    expect(
      scoreDeterministicQuestion(definition.questions[2]!, answered(['task']))
    ).toBe(0.9)

    expect(
      scoreDeterministicQuestion(definition.questions[3]!, answered(['head']))
    ).toBe(0)
  })

  it('calculates weighted coverage and accepts an independent questionnaire configuration', () => {
    const [workflow, other] = scoreDeterministicCategories(definition, {
      single: answered(['poor']),
      weighted: {
        state: 'skipped',
        selectedOptionKeys: [],
        text: null,
        optionText: {},
      },
      count: answered(['none']),
      quality: answered(['tool']),
    })
    expect(workflow).toMatchObject({ coverage: 0.75, eligible: true })
    expect(workflow?.normalized).toBeCloseTo(1 / 3)
    expect(workflow?.points).toBeCloseTo(20 / 3)

    expect(other).toMatchObject({
      normalized: 1,
      coverage: 1,
      eligible: false,
      points: 10,
    })
  })

  it('keeps missing, not-applicable, zero score, and invalid options distinct', () => {
    expect(
      scoreDeterministicQuestion(definition.questions[0]!, answered(['na']))
    ).toBe('na')

    expect(
      scoreDeterministicQuestion(definition.questions[0]!, undefined)
    ).toBeNull()

    expect(() =>
      scoreDeterministicQuestion(definition.questions[0]!, answered(['bad']))
    ).toThrow(InvalidScoringAnswerError)
  })

  it('rejects a zero-weight deterministic scoring unit at publication validation', () => {
    const invalid = {
      ...definition,
      questions: definition.questions.map((question) =>
        question.key === 'single'
          ? {
              ...question,
              scoring: { strategy: 'single_choice_value', weight: 0 },
            }
          : question
      ),
    }

    expect(questionnaireDefinitionSchema.safeParse(invalid).success).toBe(false)
  })
})
