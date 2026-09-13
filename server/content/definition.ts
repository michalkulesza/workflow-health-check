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
        })
      )
      .min(1)
      .max(100),
    questions: z.array(questionSchema).min(1).max(100),
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
