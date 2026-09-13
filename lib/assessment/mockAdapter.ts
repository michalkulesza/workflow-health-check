import {
  answerMutationInputSchema,
  answerMutationResultSchema,
  contactRequestSchema,
  createSubmissionInputSchema,
  landingSchema,
  notificationRequestSchema,
  progressMutationInputSchema,
  clarificationResponseInputSchema,
  clarificationResponseResultSchema,
  questionnaireSchema,
  reportSchema,
  submissionSchema,
  submitSubmissionInputSchema,
  submitSubmissionResultSchema,
  type AnswerMutationInput,
  type AnswerMutationResult,
  type ApiError,
  type ContactRequest,
  type CreateSubmissionInput,
  type Landing,
  type NotificationRequest,
  type ProgressMutationInput,
  type Questionnaire,
  type Report,
  type Submission,
} from './contracts'
import { AssessmentAdapterError, type AssessmentAdapter } from './adapter'

export interface MockAssessmentData {
  landing: Landing
  questionnaire: Questionnaire
  report: Report
}

const requestId = () => globalThis.crypto.randomUUID()

const adapterError = (
  code: ApiError['error']['code'],
  message: string,
  revision?: number
) =>
  new AssessmentAdapterError({
    error: { code, message, requestId: requestId() },
    ...(revision === undefined ? {} : { revision }),
  })

export const createMockAssessmentAdapter = (
  data: MockAssessmentData
): AssessmentAdapter => {
  const landing = landingSchema.parse(data.landing)
  const questionnaire = questionnaireSchema.parse(data.questionnaire)
  const report = reportSchema.parse(data.report)
  const submissions = new Map<string, Submission>()

  const mutationResults = new Map<
    string,
    { payload: string; result: AnswerMutationResult }
  >()

  const getStoredSubmission = (submissionId: string) => {
    const submission = submissions.get(submissionId)

    if (!submission) {
      throw adapterError('not_found', 'Assessment not found')
    }

    return submission
  }

  return {
    createSession: async () => undefined,
    getLanding: async () => landing,
    getQuestionnaire: async (questionnaireId) => {
      if (questionnaireId !== questionnaire.questionnaireId) {
        throw adapterError('not_found', 'Questionnaire not found')
      }

      return questionnaire
    },
    getResume: async (questionnaireId) =>
      [...submissions.values()].find(
        (submission) =>
          submission.questionnaireId === questionnaireId &&
          submission.state === 'in_progress'
      ) ?? null,
    createSubmission: async (input: CreateSubmissionInput) => {
      const parsed = createSubmissionInputSchema.parse(input)

      if (parsed.questionnaireId !== questionnaire.questionnaireId) {
        throw adapterError('not_found', 'Questionnaire not found')
      }

      if (parsed.displayedVersionId !== questionnaire.versionId) {
        throw adapterError('stale_revision', 'Questionnaire has changed')
      }

      const submission = submissionSchema.parse({
        submissionId: globalThis.crypto.randomUUID(),
        questionnaireId: questionnaire.questionnaireId,
        versionId: questionnaire.versionId,
        revision: 0,
        currentStep: 0,
        state: 'in_progress',
        answers: {},
      })
      submissions.set(submission.submissionId, submission)

      return submission
    },
    getSubmission: async (submissionId) => getStoredSubmission(submissionId),
    saveAnswer: async (input: AnswerMutationInput) => {
      const parsed = answerMutationInputSchema.parse(input)
      const payload = JSON.stringify(parsed.answer)
      const existingMutation = mutationResults.get(parsed.mutationId)

      if (existingMutation) {
        if (existingMutation.payload !== payload) {
          throw adapterError(
            'idempotency_mismatch',
            'Mutation ID was already used for different data'
          )
        }

        return existingMutation.result
      }

      const submission = getStoredSubmission(parsed.submissionId)

      if (submission.revision !== parsed.expectedRevision) {
        throw adapterError(
          'stale_revision',
          'Assessment has changed in another tab',
          submission.revision
        )
      }

      const question = questionnaire.questions.find(
        ({ key }) => key === parsed.questionKey
      )

      if (!question) {
        throw adapterError('validation_failed', 'Question does not exist')
      }

      const allowedOptions = new Set(question.options.map(({ key }) => key))

      const hasUnknownOption = parsed.answer.selectedOptionKeys.some(
        (key) => !allowedOptions.has(key)
      )

      if (hasUnknownOption) {
        throw adapterError(
          'validation_failed',
          'Answer contains an unknown option'
        )
      }

      const nextRevision = submission.revision + 1

      const nextSubmission = submissionSchema.parse({
        ...submission,
        revision: nextRevision,
        answers: { ...submission.answers, [parsed.questionKey]: parsed.answer },
      })

      const result = answerMutationResultSchema.parse({
        revision: nextRevision,
        answer: parsed.answer,
      })
      submissions.set(parsed.submissionId, nextSubmission)
      mutationResults.set(parsed.mutationId, { payload, result })

      return result
    },
    saveProgress: async (input: ProgressMutationInput) => {
      const parsed = progressMutationInputSchema.parse(input)
      const submission = getStoredSubmission(parsed.submissionId)

      if (submission.revision !== parsed.expectedRevision) {
        throw adapterError(
          'stale_revision',
          'Assessment has changed in another tab',
          submission.revision
        )
      }

      const nextSubmission = submissionSchema.parse({
        ...submission,
        currentStep: parsed.currentStep,
        revision: submission.revision + 1,
      })
      submissions.set(parsed.submissionId, nextSubmission)

      return nextSubmission
    },
    submitSubmission: async (input) => {
      const parsed = submitSubmissionInputSchema.parse(input)
      const submission = getStoredSubmission(parsed.submissionId)

      if (submission.revision !== parsed.expectedRevision) {
        throw adapterError(
          'stale_revision',
          'Assessment has changed in another tab',
          submission.revision
        )
      }

      const nextSubmission = submissionSchema.parse({
        ...submission,
        state: 'processing',
      })
      submissions.set(parsed.submissionId, nextSubmission)

      return submitSubmissionResultSchema.parse({
        revision: submission.revision,
        runId: globalThis.crypto.randomUUID(),
        state: 'submitted',
      })
    },
    submitClarification: async (input) => {
      clarificationResponseInputSchema.parse(input)
      getStoredSubmission(input.submissionId)

      return clarificationResponseResultSchema.parse({ state: 'processing' })
    },
    getReport: async (submissionId) => {
      getStoredSubmission(submissionId)

      return report
    },
    requestNotification: async (input: NotificationRequest) => {
      notificationRequestSchema.parse(input)
      getStoredSubmission(input.submissionId)
    },
    submitContact: async (input: ContactRequest) => {
      contactRequestSchema.parse(input)
      getStoredSubmission(input.submissionId)
    },
  }
}
