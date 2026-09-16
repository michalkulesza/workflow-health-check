import { z } from 'zod'

export const REQUIRED_TEXT_MIN_LENGTH = 20

export const questionnaireIdSchema = z.string().uuid()
export const versionIdSchema = z.string().min(1).max(128)
export const stableKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
export const revisionSchema = z.number().int().nonnegative()
export const mutationIdSchema = z.string().uuid()
export const emailSchema = z.string().email().max(320)

export const landingSchema = z.object({
  pageTitle: z.string().min(1).max(160),
  metaDescription: z.string().min(1).max(320),
  headline: z.string().min(1).max(320),
  supporting: z.string().min(1).max(2_000),
  audienceTitle: z.string().min(1).max(160),
  audience: z.string().min(1).max(2_000),
  steps: z.array(z.object({ title: z.string(), text: z.string() })).max(8),
  buttonLabel: z.string().min(1).max(120),
  questionnaireId: questionnaireIdSchema,
})

export const optionSchema = z.object({
  key: stableKeySchema,
  label: z.string().min(1).max(500),
  exclusive: z.boolean().default(false),
  requiresText: z.boolean().default(false),
})

export const questionSchema = z.object({
  key: stableKeySchema,
  number: z.number().int().positive(),
  categoryKey: stableKeySchema,
  prompt: z.string().min(1).max(4_000),
  type: z.enum(['single', 'multi', 'text']),
  required: z.boolean(),
  instructions: z.string().min(1).max(2_000).nullable(),
  maxSelections: z.number().int().positive().nullable(),
  options: z.array(optionSchema).max(100),
})

export const questionnaireSchema = z.object({
  questionnaireId: questionnaireIdSchema,
  versionId: versionIdSchema,
  versionHash: z.string().min(1).max(128),
  categories: z.array(
    z.object({ key: stableKeySchema, label: z.string().min(1).max(160) })
  ),
  questions: z.array(questionSchema).min(1).max(100),
})

export const answerValueSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('answered'),
    selectedOptionKeys: z.array(stableKeySchema).max(100),
    text: z.string().max(4_000).nullable(),
    optionText: z.record(stableKeySchema, z.string().max(1_000)),
  }),
  z.object({
    state: z.literal('skipped'),
    selectedOptionKeys: z.tuple([]),
    text: z.null(),
    optionText: z.record(stableKeySchema, z.string().max(1_000)),
  }),
])

export const submissionStateSchema = z.enum([
  'in_progress',
  'submitted',
  'processing',
  'awaiting_clarification',
  'ready',
  'partial',
  'failed',
])

export const submissionSchema = z.object({
  submissionId: z.string().uuid(),
  questionnaireId: questionnaireIdSchema,
  versionId: versionIdSchema,
  revision: revisionSchema,
  currentStep: z.number().int().nonnegative(),
  state: submissionStateSchema,
  answers: z.record(stableKeySchema, answerValueSchema),
  clarification: z
    .object({
      evaluationKey: stableKeySchema,
      prompt: z.string().min(1).max(4_000),
    })
    .nullable()
    .default(null),
})

export const createSubmissionInputSchema = z
  .object({
    questionnaireId: questionnaireIdSchema,
    displayedVersionId: versionIdSchema,
  })
  .strict()

export const answerMutationInputSchema = z
  .object({
    submissionId: z.string().uuid(),
    questionKey: stableKeySchema,
    expectedRevision: revisionSchema,
    mutationId: mutationIdSchema,
    answer: answerValueSchema,
  })
  .strict()

export const answerMutationResultSchema = z.object({
  revision: revisionSchema,
  answer: answerValueSchema,
})

export const progressMutationInputSchema = z
  .object({
    submissionId: z.string().uuid(),
    currentStep: z.number().int().nonnegative(),
    expectedRevision: revisionSchema,
  })
  .strict()

export const submitSubmissionInputSchema = z
  .object({
    submissionId: z.string().uuid(),
    expectedRevision: revisionSchema,
    mutationId: mutationIdSchema,
  })
  .strict()

export const submitSubmissionResultSchema = z.object({
  revision: revisionSchema,
  runId: z.string().min(1),
  state: z.literal('submitted'),
})

export const clarificationResponseResultSchema = z.object({
  state: z.literal('processing'),
})

export const clarificationResponseInputSchema = z
  .object({
    submissionId: z.string().uuid(),
    evaluationKey: stableKeySchema,
    response: z.string().trim().min(1).max(4_000),
  })
  .strict()

export const prioritySchema = z.object({
  categoryKey: stableKeySchema,
  categoryLabel: z.string().min(1).max(160),
  score: z.number().finite().nonnegative(),
  maxPoints: z.number().finite().positive(),
  explanation: z.string().min(1).max(4_000),
  firstStep: z.string().min(1).max(2_000),
})

export const reportSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('pending'),
    analysisComplete: z.literal(false),
    priorities: z.array(prioritySchema).max(2),
    summary: z.string().min(1).max(4_000),
    pendingCategories: z.array(stableKeySchema).min(1),
  }),
  z.object({
    status: z.enum(['complete', 'partial', 'insufficient', 'failed']),
    analysisComplete: z.boolean(),
    priorities: z.array(prioritySchema).max(2),
    summary: z.string().min(1).max(4_000),
    pendingCategories: z.array(stableKeySchema),
  }),
])

export const notificationRequestSchema = z
  .object({
    submissionId: z.string().uuid(),
    email: emailSchema,
    purpose: z.literal('report_ready'),
  })
  .strict()

export const contactRequestSchema = z
  .object({
    submissionId: z.string().uuid(),
    email: emailSchema,
    name: z.string().trim().min(1).max(160).nullable(),
    message: z.string().trim().min(1).max(4_000).nullable(),
    idempotencyKey: mutationIdSchema,
  })
  .strict()

export const apiErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'not_found',
  'stale_revision',
  'invalid_state',
  'idempotency_mismatch',
  'validation_failed',
  'rate_limited',
  'temporary_failure',
])

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1).max(1_000),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    requestId: z.string().min(1).max(128),
  }),
  revision: revisionSchema.optional(),
})

export type Landing = z.infer<typeof landingSchema>
export type Questionnaire = z.infer<typeof questionnaireSchema>
export type AnswerValue = z.infer<typeof answerValueSchema>
export type Submission = z.infer<typeof submissionSchema>
export type CreateSubmissionInput = z.infer<typeof createSubmissionInputSchema>
export type AnswerMutationInput = z.infer<typeof answerMutationInputSchema>
export type AnswerMutationResult = z.infer<typeof answerMutationResultSchema>
export type ProgressMutationInput = z.infer<typeof progressMutationInputSchema>
export type SubmitSubmissionInput = z.infer<typeof submitSubmissionInputSchema>
export type SubmitSubmissionResult = z.infer<
  typeof submitSubmissionResultSchema
>
export type ClarificationResponseInput = z.infer<
  typeof clarificationResponseInputSchema
>
export type ClarificationResponseResult = z.infer<
  typeof clarificationResponseResultSchema
>
export type Report = z.infer<typeof reportSchema>
export type NotificationRequest = z.infer<typeof notificationRequestSchema>
export type ContactRequest = z.infer<typeof contactRequestSchema>
export type ApiError = z.infer<typeof apiErrorSchema>
