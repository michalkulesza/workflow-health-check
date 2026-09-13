import { createHash } from 'node:crypto'

import { z } from 'zod'

const stableKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)

const optionSchema = z.object({
  key: stableKeySchema,
  label: z.string().trim().min(1).max(500),
  exclusive: z.boolean().default(false),
  requiresText: z.boolean().default(false),
  value: z.number().finite().min(0).max(1).nullable().default(null),
  penalty: z.number().finite().nonnegative().nullable().default(null),
  notApplicable: z.boolean().default(false),
})

const curveSchema = z
  .array(
    z.object({
      atLeast: z.number().int().positive(),
      value: z.number().finite().min(0).max(1),
    })
  )
  .min(1)
  .superRefine((buckets, context) => {
    const values = new Set<number>()
    for (const bucket of buckets) {
      if (values.has(bucket.atLeast)) {
        context.addIssue({
          code: 'custom',
          message: 'A count curve cannot repeat a bucket',
        })
      }

      values.add(bucket.atLeast)
    }
  })

const scoringSchema = z
  .discriminatedUnion('strategy', [
    z.object({ strategy: z.literal('none'), weight: z.literal(0).default(0) }),
    z.object({
      strategy: z.literal('ai_rubric'),
      weight: z.number().finite().positive(),
    }),
    z.object({
      strategy: z.literal('single_choice_value'),
      weight: z.number().finite().positive().default(1),
    }),
    z.object({
      strategy: z.literal('multi_select_count'),
      weight: z.number().finite().positive().default(1),
      curve: curveSchema,
      exclusiveValue: z.number().finite().min(0).max(1).default(1),
    }),
    z.object({
      strategy: z.literal('multi_select_weighted'),
      weight: z.number().finite().positive().default(1),
      penaltyDenominator: z.number().finite().positive(),
      exclusiveValue: z.number().finite().min(0).max(1).default(1),
    }),
    z.object({
      strategy: z.literal('multi_select_quality_quantity'),
      weight: z.number().finite().positive().default(1),
      qualityWeight: z.number().finite().nonnegative(),
      quantityWeight: z.number().finite().nonnegative(),
      quantityCurve: curveSchema,
      singletonOverride: z
        .object({
          optionKey: stableKeySchema,
          value: z.number().finite().min(0).max(1),
        })
        .nullable()
        .default(null),
    }),
  ])
  .superRefine((scoring, context) => {
    if (
      scoring.strategy === 'multi_select_quality_quantity' &&
      scoring.qualityWeight + scoring.quantityWeight !== 1
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Quality and quantity weights must total 1',
      })
    }
  })

const questionSchema = z.object({
  key: stableKeySchema,
  number: z.number().int().positive(),
  categoryKey: stableKeySchema,
  prompt: z.string().trim().min(1).max(4_000),
  type: z.enum(['single', 'multi', 'text']),
  required: z.boolean(),
  instructions: z.string().trim().min(1).max(2_000).nullable(),
  maxSelections: z.number().int().positive().nullable(),
  options: z.array(optionSchema).max(100),
  scoring: scoringSchema.default({ strategy: 'none', weight: 0 }),
})

const aiEvaluationSchema = z.object({
  key: stableKeySchema,
  categoryKey: stableKeySchema,
  evaluationQuestionKeys: z.array(stableKeySchema).min(1).max(20),
  contextQuestionKeys: z.array(stableKeySchema).max(50).default([]),
  rubricVersion: z.string().trim().min(1).max(128),
  promptVersion: z.string().trim().min(1).max(128),
  model: z.string().trim().min(1).max(128),
  levels: z
    .array(
      z.object({
        level: z.number().int().min(1).max(5),
        description: z.string().trim().min(1).max(4_000),
      })
    )
    .length(5),
  weight: z.number().finite().positive().default(1),
})

export const questionnaireDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    categories: z
      .array(
        z.object({
          key: stableKeySchema,
          label: z.string().trim().min(1).max(160),
          order: z.number().int().nonnegative(),
          scored: z.boolean().default(false),
          maxPoints: z.number().finite().positive().default(20),
          attentionThreshold: z.number().finite().min(0).max(1).default(0.6),
          minimumCoverage: z.number().finite().min(0).max(1).default(0.6),
        })
      )
      .min(1)
      .max(100),
    questions: z.array(questionSchema).min(1).max(100),
    aiEvaluations: z.array(aiEvaluationSchema).max(100).default([]),
  })
  .superRefine((definition, context) => {
    const categoryKeys = new Set<string>()

    for (const category of definition.categories) {
      if (categoryKeys.has(category.key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate category key: ${category.key}`,
        })
      }

      categoryKeys.add(category.key)
    }

    const questionKeys = new Set<string>()
    const questionNumbers = new Set<number>()

    for (const question of definition.questions) {
      if (!categoryKeys.has(question.categoryKey)) {
        context.addIssue({
          code: 'custom',
          message: `Question ${question.key} references an unknown category`,
        })
      }

      if (questionKeys.has(question.key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate question key: ${question.key}`,
        })
      }

      if (questionNumbers.has(question.number)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate question number: ${question.number}`,
        })
      }

      questionKeys.add(question.key)
      questionNumbers.add(question.number)

      if (question.type === 'text' && question.options.length > 0) {
        context.addIssue({
          code: 'custom',
          message: `Text question ${question.key} cannot define options`,
        })
      }

      if (question.type !== 'text' && question.options.length === 0) {
        context.addIssue({
          code: 'custom',
          message: `Choice question ${question.key} requires options`,
        })
      }

      if (question.type !== 'multi' && question.maxSelections !== null) {
        context.addIssue({
          code: 'custom',
          message: `Only multi-select question ${question.key} can set a selection limit`,
        })
      }

      if (
        question.maxSelections !== null &&
        question.maxSelections > question.options.length
      ) {
        context.addIssue({
          code: 'custom',
          message: `Selection limit for ${question.key} exceeds its options`,
        })
      }

      const optionKeys = new Set<string>()

      for (const option of question.options) {
        if (optionKeys.has(option.key)) {
          context.addIssue({
            code: 'custom',
            message: `Question ${question.key} has a duplicate option key`,
          })
        }

        optionKeys.add(option.key)
      }

      const { scoring } = question

      if (
        scoring.strategy === 'single_choice_value' &&
        (question.type !== 'single' ||
          question.options.some(
            (option) => !option.notApplicable && option.value === null
          ))
      ) {
        context.addIssue({
          code: 'custom',
          message: `Single-choice scoring for ${question.key} requires a value for every option`,
        })
      }

      if (
        scoring.strategy === 'multi_select_weighted' &&
        (question.type !== 'multi' ||
          question.options.some(
            (option) => !option.exclusive && option.penalty === null
          ))
      ) {
        context.addIssue({
          code: 'custom',
          message: `Weighted scoring for ${question.key} requires penalties for non-exclusive options`,
        })
      }

      if (
        scoring.strategy === 'multi_select_count' &&
        question.type !== 'multi'
      ) {
        context.addIssue({
          code: 'custom',
          message: `Count scoring for ${question.key} requires a multi-select question`,
        })
      }

      if (scoring.strategy === 'multi_select_quality_quantity') {
        if (
          question.type !== 'multi' ||
          question.options.some((option) => option.value === null)
        ) {
          context.addIssue({
            code: 'custom',
            message: `Quality/quantity scoring for ${question.key} requires values for every option`,
          })
        }

        if (
          scoring.singletonOverride &&
          !optionKeys.has(scoring.singletonOverride.optionKey)
        ) {
          context.addIssue({
            code: 'custom',
            message: `Singleton override for ${question.key} references an unknown option`,
          })
        }
      }
    }

    const evaluatedQuestionKeys = new Set<string>()
    for (const evaluation of definition.aiEvaluations) {
      if (!categoryKeys.has(evaluation.categoryKey)) {
        context.addIssue({
          code: 'custom',
          message: `AI evaluation ${evaluation.key} references an unknown category`,
        })
      }

      for (const key of evaluation.evaluationQuestionKeys) {
        const question = definition.questions.find(
          (candidate) => candidate.key === key
        )

        if (!question || question.scoring.strategy !== 'ai_rubric') {
          context.addIssue({
            code: 'custom',
            message: `AI evaluation ${evaluation.key} must reference an ai_rubric question: ${key}`,
          })
        }

        if (evaluatedQuestionKeys.has(key)) {
          context.addIssue({
            code: 'custom',
            message: `AI rubric question ${key} is counted more than once`,
          })
        }

        evaluatedQuestionKeys.add(key)
      }
      for (const key of evaluation.contextQuestionKeys) {
        if (!questionKeys.has(key)) {
          context.addIssue({
            code: 'custom',
            message: `AI evaluation ${evaluation.key} references an unknown context question: ${key}`,
          })
        }
      }

      if (new Set(evaluation.levels.map((level) => level.level)).size !== 5) {
        context.addIssue({
          code: 'custom',
          message: `AI evaluation ${evaluation.key} needs levels 1 through 5 exactly once`,
        })
      }
    }

    for (const question of definition.questions) {
      if (
        question.scoring.strategy === 'ai_rubric' &&
        !evaluatedQuestionKeys.has(question.key)
      ) {
        context.addIssue({
          code: 'custom',
          message: `AI rubric question ${question.key} is not assigned to an evaluation`,
        })
      }
    }

    for (const category of definition.categories) {
      const units = definition.questions.filter(
        (question) =>
          question.categoryKey === category.key &&
          question.scoring.strategy !== 'none'
      )

      const aiUnits = definition.aiEvaluations.filter(
        (evaluation) => evaluation.categoryKey === category.key
      )

      if (category.scored && units.length === 0 && aiUnits.length === 0) {
        context.addIssue({
          code: 'custom',
          message: `Scored category ${category.key} requires a deterministic scoring unit`,
        })
      }

      if (!category.scored && (units.length > 0 || aiUnits.length > 0)) {
        context.addIssue({
          code: 'custom',
          message: `Unscored category ${category.key} cannot contain deterministic scoring units`,
        })
      }
    }
  })

export type QuestionnaireDefinition = z.infer<
  typeof questionnaireDefinitionSchema
>

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)])
    )
  }

  return value
}

export const hashDefinition = (definition: QuestionnaireDefinition): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(definition)))
    .digest('hex')
