import { describe, expect, it } from 'vitest'

import { HttpAssessmentAdapter } from './httpAdapter'

const QUESTIONNAIRE_ID = '5dc13945-9cb8-4e6b-b504-187c885e0e34'

describe('HTTP assessment adapter', () => {
  it('validates response payloads and never sends prototype scenario controls', async () => {
    const requests: Array<{ body?: string; url: string }> = []

    const adapter = new HttpAssessmentAdapter({
      basePath: 'https://assessment.test/api/assessment/v1',
      fetcher: async (input, init) => {
        requests.push({ body: init?.body?.toString(), url: input.toString() })

        return Response.json({
          submissionId: 'a82fd5b4-c92f-4d3c-a3a1-97ff8b7f2c52',
          questionnaireId: QUESTIONNAIRE_ID,
          versionId: 'creative-workflow-v1',
          revision: 0,
          currentStep: 0,
          state: 'in_progress',
          answers: {},
        })
      },
    })

    await adapter.createSubmission({
      questionnaireId: QUESTIONNAIRE_ID,
      displayedVersionId: 'creative-workflow-v1',
    })

    expect(requests).toEqual([
      {
        body: JSON.stringify({
          questionnaireId: QUESTIONNAIRE_ID,
          displayedVersionId: 'creative-workflow-v1',
        }),
        url: 'https://assessment.test/api/assessment/v1/submissions',
      },
    ])
  })

  it('maps validated API errors to an adapter error', async () => {
    const adapter = new HttpAssessmentAdapter({
      fetcher: async () =>
        Response.json(
          {
            error: {
              code: 'not_found',
              message: 'Questionnaire not found',
              requestId: 'request-123',
            },
          },
          { status: 404 }
        ),
    })

    await expect(
      adapter.getQuestionnaire(QUESTIONNAIRE_ID)
    ).rejects.toMatchObject({
      response: { error: { code: 'not_found' } },
    })
  })
})
