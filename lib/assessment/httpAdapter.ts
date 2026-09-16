import { z } from 'zod'

import {
  answerMutationInputSchema,
  answerMutationResultSchema,
  apiErrorSchema,
  contactRequestSchema,
  createSubmissionInputSchema,
  landingSchema,
  notificationRequestSchema,
  progressMutationInputSchema,
  questionnaireSchema,
  reportSchema,
  clarificationResponseInputSchema,
  clarificationResponseResultSchema,
  submitSubmissionInputSchema,
  submitSubmissionResultSchema,
  submissionSchema,
  type AnswerMutationInput,
  type AnswerMutationResult,
  type ContactRequest,
  type CreateSubmissionInput,
  type Landing,
  type NotificationRequest,
  type ProgressMutationInput,
  type Questionnaire,
  type Report,
  type Submission,
  type SubmitSubmissionInput,
  type SubmitSubmissionResult,
  type ClarificationResponseInput,
  type ClarificationResponseResult,
} from './contracts'
import { AssessmentAdapterError, type AssessmentAdapter } from './adapter'

const acceptedResponseSchema = z.object({ accepted: z.literal(true) }).strict()
const sessionResponseSchema = z.object({ csrfToken: z.string().min(1) })

type Fetcher = typeof fetch
const CLARIFICATION_REQUEST_TIMEOUT_MS = 30_000

export class HttpAssessmentAdapter implements AssessmentAdapter {
  private readonly basePath: string
  private readonly fetcher: Fetcher
  private csrfToken: string | null = null

  constructor({
    basePath = '/api/assessment/v1',
    fetcher = (...args) => fetch(...args),
  }: {
    basePath?: string
    fetcher?: Fetcher
  } = {}) {
    this.basePath = basePath.replace(/\/$/, '')
    this.fetcher = fetcher
  }

  async createSession(): Promise<void> {
    const response = await this.fetcher(`${this.basePath}/sessions`, {
      method: 'POST',
      credentials: 'include',
    })
    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new AssessmentAdapterError({
        error: {
          code: 'temporary_failure',
          message: 'Could not start an assessment session',
          requestId: 'session-start',
        },
      })
    }

    this.csrfToken = sessionResponseSchema.parse(body).csrfToken
  }

  async getLanding(): Promise<Landing> {
    return this.request('/landing', { method: 'GET' }, landingSchema)
  }

  async getQuestionnaire(questionnaireId: string): Promise<Questionnaire> {
    return this.request(
      `/questionnaires/${encodeURIComponent(questionnaireId)}`,
      { method: 'GET' },
      questionnaireSchema
    )
  }

  async getResume(questionnaireId: string): Promise<Submission | null> {
    return this.request(
      `/questionnaires/${encodeURIComponent(questionnaireId)}/resume`,
      { method: 'GET' },
      submissionSchema.nullable()
    )
  }

  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    return this.request(
      '/submissions',
      { method: 'POST', body: createSubmissionInputSchema.parse(input) },
      submissionSchema
    )
  }

  async getSubmission(submissionId: string): Promise<Submission> {
    return this.request(
      `/submissions/${encodeURIComponent(submissionId)}`,
      { method: 'GET' },
      submissionSchema
    )
  }

  async saveAnswer(input: AnswerMutationInput): Promise<AnswerMutationResult> {
    const parsed = answerMutationInputSchema.parse(input)

    return this.request(
      `/submissions/${encodeURIComponent(parsed.submissionId)}/answers/${encodeURIComponent(parsed.questionKey)}`,
      { method: 'PUT', body: parsed },
      answerMutationResultSchema
    )
  }

  async saveProgress(input: ProgressMutationInput): Promise<Submission> {
    return this.request(
      `/submissions/${encodeURIComponent(input.submissionId)}/progress`,
      { method: 'PATCH', body: progressMutationInputSchema.parse(input) },
      submissionSchema
    )
  }

  async getReport(submissionId: string): Promise<Report> {
    return this.request(
      `/submissions/${encodeURIComponent(submissionId)}/report`,
      { method: 'GET' },
      reportSchema
    )
  }

  async submitSubmission(
    input: SubmitSubmissionInput
  ): Promise<SubmitSubmissionResult> {
    const parsed = submitSubmissionInputSchema.parse(input)

    return this.request(
      `/submissions/${encodeURIComponent(parsed.submissionId)}/submit`,
      { method: 'POST', body: parsed },
      submitSubmissionResultSchema
    )
  }

  async submitClarification(
    input: ClarificationResponseInput
  ): Promise<ClarificationResponseResult> {
    const parsed = clarificationResponseInputSchema.parse(input)
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      CLARIFICATION_REQUEST_TIMEOUT_MS
    )

    try {
      return await this.request(
        `/submissions/${encodeURIComponent(parsed.submissionId)}/clarification`,
        { method: 'POST', body: parsed, signal: controller.signal },
        clarificationResponseResultSchema
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  async requestNotification(input: NotificationRequest): Promise<void> {
    await this.request(
      `/submissions/${encodeURIComponent(input.submissionId)}/notification`,
      { method: 'POST', body: notificationRequestSchema.parse(input) },
      acceptedResponseSchema
    )
  }

  async submitContact(input: ContactRequest): Promise<void> {
    await this.request(
      `/submissions/${encodeURIComponent(input.submissionId)}/contact`,
      { method: 'POST', body: contactRequestSchema.parse(input) },
      acceptedResponseSchema
    )
  }

  private async request<T>(
    path: string,
    options: {
      body?: unknown
      method: 'GET' | 'PATCH' | 'POST' | 'PUT'
      signal?: AbortSignal
    },
    schema: z.ZodType<T>
  ): Promise<T> {
    const response = await this.fetcher(`${this.basePath}${path}`, {
      method: options.method,
      signal: options.signal,
      credentials: 'include',
      headers:
        options.body === undefined
          ? undefined
          : {
              'content-type': 'application/json',
              ...(this.csrfToken
                ? { 'x-assessment-csrf': this.csrfToken }
                : {}),
            },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const parsedError = apiErrorSchema.safeParse(body)

      if (parsedError.success) {
        throw new AssessmentAdapterError(parsedError.data)
      }

      throw new AssessmentAdapterError({
        error: {
          code: 'temporary_failure',
          message: 'The assessment service returned an invalid error response',
          requestId: 'invalid-response',
        },
      })
    }

    return schema.parse(body)
  }
}
