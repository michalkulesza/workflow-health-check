import {
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
  type SubmitSubmissionInput,
  type SubmitSubmissionResult,
  type ClarificationResponseInput,
  type ClarificationResponseResult,
} from './contracts'

export interface AssessmentAdapter {
  createSession: () => Promise<void>
  getLanding: () => Promise<Landing>
  getQuestionnaire: (questionnaireId: string) => Promise<Questionnaire>
  getResume: (questionnaireId: string) => Promise<Submission | null>
  createSubmission: (input: CreateSubmissionInput) => Promise<Submission>
  getSubmission: (submissionId: string) => Promise<Submission>
  saveAnswer: (input: AnswerMutationInput) => Promise<AnswerMutationResult>
  saveProgress: (input: ProgressMutationInput) => Promise<Submission>
  submitSubmission: (
    input: SubmitSubmissionInput
  ) => Promise<SubmitSubmissionResult>
  submitClarification: (
    input: ClarificationResponseInput
  ) => Promise<ClarificationResponseResult>
  getReport: (submissionId: string) => Promise<Report>
  requestNotification: (input: NotificationRequest) => Promise<void>
  submitContact: (input: ContactRequest) => Promise<void>
}

export class AssessmentAdapterError extends Error {
  readonly response: ApiError

  constructor(response: ApiError) {
    super(response.error.message)
    this.name = 'AssessmentAdapterError'
    this.response = response
  }
}
