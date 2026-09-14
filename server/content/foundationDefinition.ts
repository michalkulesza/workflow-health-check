import { categories, questions } from '@/lib/fixtures'

import { questionnaireDefinitionSchema } from './definition'

const scoringForQuestion = (question: (typeof questions)[number]) => {
  switch (question.strategy) {
    case 'single_choice_value':
      return { strategy: question.strategy, weight: 1 } as const
    case 'multi_select_count':
      return {
        strategy: question.strategy,
        weight: 1,
        curve: [
          { atLeast: 1, value: 0.9 },
          { atLeast: 2, value: 0.8 },
          { atLeast: 3, value: 0.7 },
          { atLeast: 4, value: 0.6 },
          { atLeast: 5, value: 0.5 },
          { atLeast: 6, value: 0.4 },
          { atLeast: 7, value: 0.3 },
          { atLeast: 8, value: 0.2 },
          { atLeast: 9, value: 0.1 },
          { atLeast: 10, value: 0 },
        ],
        exclusiveValue: 1,
      } as const
    case 'multi_select_weighted':
      return {
        strategy: question.strategy,
        weight: 1,
        penaltyDenominator: 16.5,
        exclusiveValue: 1,
      } as const
    case 'multi_select_quality_quantity':
      return {
        strategy: question.strategy,
        weight: 1,
        qualityWeight: 0.6,
        quantityWeight: 0.4,
        quantityCurve: [
          { atLeast: 1, value: 1 },
          { atLeast: 2, value: 0.8 },
          { atLeast: 3, value: 0.55 },
          { atLeast: 4, value: 0.3 },
          { atLeast: 5, value: 0 },
        ],
        singletonOverride: { optionKey: 'head', value: 0 },
      } as const
    case 'ai_rubric':
      return { strategy: question.strategy, weight: 1 } as const
    case 'none':
      return { strategy: 'none', weight: 0 } as const
  }
}

export const createFoundationDefinition = (
  model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
) =>
  questionnaireDefinitionSchema.parse({
    schemaVersion: 1,
    categories: categories.map((category, index) => ({
      key: category.id,
      label: category.name,
      order: index,
      scored: category.scored,
      maxPoints: category.maxPoints,
      attentionThreshold: category.attentionThreshold,
      minimumCoverage: 0.6,
    })),
    questions: questions.map((question) => ({
      key: question.id,
      number: question.number,
      categoryKey: question.categoryId,
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      instructions: question.instructions ?? null,
      maxSelections: question.maxSelections ?? null,
      options: (question.options ?? []).map((option) => ({
        key: option.id,
        label: option.label,
        exclusive: option.exclusive ?? false,
        requiresText: option.requiresText ?? false,
        value:
          question.strategy === 'multi_select_weighted'
            ? null
            : (option.value ?? null),
        penalty: question.id === 'q8' ? (option.value ?? null) : null,
        notApplicable: option.notApplicable ?? false,
      })),
      scoring: scoringForQuestion(question),
    })),
    aiEvaluations: [
      {
        key: 'creative-friction',
        categoryKey: 'friction',
        evaluationQuestionKeys: ['q11', 'q12', 'q13'],
        contextQuestionKeys: ['q1', 'q2', 'q3', 'q14', 'q15', 'q16'],
        rubricVersion: 'creative-friction-v1-draft',
        promptVersion: 'creative-friction-v1',
        model,
        levels: [
          { level: 1, description: 'Reactive and repeatedly losing control.' },
          { level: 2, description: 'Some structure, but unreliable.' },
          { level: 3, description: 'Partly reliable, with recurring gaps.' },
          { level: 4, description: 'Reliable with bounded weaknesses.' },
          { level: 5, description: 'Reliable and demonstrably resilient.' },
        ],
        weight: 1,
      },
    ],
  })
