import { describe, expect, it } from 'vitest'

import {
  answerMutationInputSchema,
  createSubmissionInputSchema,
} from './contracts'
import {
  createMockAssessmentAdapter,
  type MockAssessmentData,
} from './mockAdapter'

const QUESTIONNAIRE_ID = '5dc13945-9cb8-4e6b-b504-187c885e0e34'
const MUTATION_ID = 'f13f2ea8-9194-4f98-a46c-29727e985a52'

const data: MockAssessmentData = {
  landing: {
    pageTitle: 'Workflow Check',
    metaDescription: 'A short assessment.',
    headline: 'Find workflow friction.',
    supporting: 'Answer practical questions.',
    audienceTitle: 'Creative work',
    audience: 'For creative professionals.',
    steps: [{ title: 'Answer', text: 'Answer one question at a time.' }],
    buttonLabel: 'Start',
    questionnaireId: QUESTIONNAIRE_ID,
  },
  questionnaire: {
    questionnaireId: QUESTIONNAIRE_ID,
    versionId: 'creative-workflow-v1',
    versionHash: 'fixture-hash',
    categories: [{ key: 'project', label: 'Project' }],
    questions: [
      {
        key: 'q1',
        number: 1,
        categoryKey: 'project',
        prompt: 'Where is your project information?',
        type: 'single',
        required: true,
        instructions: null,
        maxSelections: null,
        options: [
          {
            key: 'one-place',
            label: 'One place',
            exclusive: false,
            requiresText: false,
          },
        ],
      },
    ],
  },
  report: {
    status: 'pending',
    analysisComplete: false,
    priorities: [],
    summary: 'Analysis is pending.',
    pendingCategories: ['project'],
  },
}

describe('assessment contracts', () => {
  it('rejects prototype scenarios from production DTOs', () => {
    expect(
      createSubmissionInputSchema.safeParse({
        questionnaireId: QUESTIONNAIRE_ID,
        displayedVersionId: 'creative-workflow-v1',
        scenario: 'happy',
      }).success
    ).toBe(false)
  })

  it('rejects malformed answer mutations', () => {
    expect(
      answerMutationInputSchema.safeParse({
        submissionId: QUESTIONNAIRE_ID,
        questionKey: 'q1',
        expectedRevision: -1,
        mutationId: MUTATION_ID,
        answer: {
          state: 'answered',
          selectedOptionKeys: [],
          text: null,
          optionText: {},
        },
      }).success
    ).toBe(false)
  })
})

describe('mock assessment adapter', () => {
  it('deduplicates a retried answer mutation and increments the revision once', async () => {
    const adapter = createMockAssessmentAdapter(data)

    const submission = await adapter.createSubmission({
      questionnaireId: QUESTIONNAIRE_ID,
      displayedVersionId: 'creative-workflow-v1',
    })

    const input = {
      submissionId: submission.submissionId,
      questionKey: 'q1',
      expectedRevision: 0,
      mutationId: MUTATION_ID,
      answer: {
        state: 'answered' as const,
        selectedOptionKeys: ['one-place'],
        text: null,
        optionText: {},
      },
    }

    await expect(adapter.saveAnswer(input)).resolves.toMatchObject({
      revision: 1,
    })

    await expect(adapter.saveAnswer(input)).resolves.toMatchObject({
      revision: 1,
    })

    await expect(
      adapter.getSubmission(submission.submissionId)
    ).resolves.toMatchObject({
      revision: 1,
    })
  })

  it('returns a typed stale-revision error instead of overwriting another update', async () => {
    const adapter = createMockAssessmentAdapter(data)

    const submission = await adapter.createSubmission({
      questionnaireId: QUESTIONNAIRE_ID,
      displayedVersionId: 'creative-workflow-v1',
    })

    await adapter.saveProgress({
      submissionId: submission.submissionId,
      currentStep: 1,
      expectedRevision: 0,
    })

    await expect(
      adapter.saveAnswer({
        submissionId: submission.submissionId,
        questionKey: 'q1',
        expectedRevision: 0,
        mutationId: MUTATION_ID,
        answer: {
          state: 'answered',
          selectedOptionKeys: ['one-place'],
          text: null,
          optionText: {},
        },
      })
    ).rejects.toMatchObject({
      response: { error: { code: 'stale_revision' }, revision: 1 },
    })
  })

  it('rejects a reused mutation ID with different answer data', async () => {
    const adapter = createMockAssessmentAdapter(data)

    const submission = await adapter.createSubmission({
      questionnaireId: QUESTIONNAIRE_ID,
      displayedVersionId: 'creative-workflow-v1',
    })

    const input = {
      submissionId: submission.submissionId,
      questionKey: 'q1',
      expectedRevision: 0,
      mutationId: MUTATION_ID,
      answer: {
        state: 'answered' as const,
        selectedOptionKeys: ['one-place'],
        text: null,
        optionText: {},
      },
    }

    await adapter.saveAnswer(input)

    await expect(
      adapter.saveAnswer({
        ...input,
        answer: { ...input.answer, text: 'Different answer data' },
      })
    ).rejects.toMatchObject({
      response: { error: { code: 'idempotency_mismatch' } },
    })
  })
})
