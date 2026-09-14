import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload } from 'payload'

import { publishQuestionnaire } from '@/server/content/publishQuestionnaire'
import { questionnaireDefinitionSchema } from '@/server/content/definition'
import { dispatchAssessmentOutbox } from '@/server/jobs/outbox'

const ORIGIN = 'http://assessment.test'

type Session = { cookie: string; csrfToken: string }

let payload: Awaited<ReturnType<typeof getPayload>>
let questionnaireID: string
let versionID: string

const request = (path: string, init?: RequestInit) =>
  new Request(`${ORIGIN}${path}`, init)

const session = async (): Promise<Session> => {
  const { POST } =
    await import('@/app/(frontend)/api/assessment/v1/sessions/route')

  const response = await POST(
    request('/api/assessment/v1/sessions', {
      headers: { origin: ORIGIN },
      method: 'POST',
    })
  )
  const body = (await response.json()) as { csrfToken: string }
  const setCookie = response.headers.get('set-cookie') ?? ''
  const token = /assessment_session=([^;]+)/.exec(setCookie)?.[1]

  if (!token) {
    throw new Error('Session response did not set a session cookie')
  }

  return { cookie: `assessment_session=${token}`, csrfToken: body.csrfToken }
}

const createSubmission = async (current: Session) => {
  const { POST } =
    await import('@/app/(frontend)/api/assessment/v1/submissions/route')

  const response = await POST(
    request('/api/assessment/v1/submissions', {
      body: JSON.stringify({
        displayedVersionId: versionID,
        questionnaireId: questionnaireID,
      }),
      headers: { cookie: current.cookie, origin: ORIGIN },
      method: 'POST',
    })
  )

  expect(response.status).toBe(201)

  return (await response.json()) as { submissionId: string; revision: number }
}

beforeAll(async () => {
  const { default: config } = await import('@/payload.config')

  payload = await getPayload({ config })
  questionnaireID = randomUUID()

  const questionnaire = await payload.create({
    collection: 'questionnaires',
    data: { name: 'Integration questionnaire', publicId: questionnaireID },
    overrideAccess: true,
  })

  const definition = questionnaireDefinitionSchema.parse({
    schemaVersion: 1,
    categories: [{ key: 'operations', label: 'Operations', order: 0 }],
    questions: [
      {
        key: 'tools',
        number: 1,
        categoryKey: 'operations',
        prompt: 'Which tools do you use?',
        type: 'multi',
        required: true,
        instructions: null,
        maxSelections: 2,
        options: [
          { key: 'none', label: 'None', exclusive: true, requiresText: false },
          {
            key: 'other',
            label: 'Other',
            exclusive: false,
            requiresText: true,
          },
          { key: 'crm', label: 'CRM', exclusive: false, requiresText: false },
        ],
      },
    ],
  })

  const draft = await payload.create({
    collection: 'questionnaire-versions',
    data: {
      questionnaire: questionnaire.id,
      status: 'draft',
      categories: definition.categories,
      questions: definition.questions,
      definition,
      contentHash: 'created-by-hook',
    },
    overrideAccess: true,
  })

  await payload.update({
    collection: 'questionnaires',
    id: questionnaire.id,
    data: { draftVersion: draft.id },
    overrideAccess: true,
  })

  const published = await publishQuestionnaire({
    payload,
    questionnaireID: questionnaire.id,
    draftVersionID: draft.id,
  })

  versionID = String(published.publishedVersionID)
})

afterAll(async () => {
  await payload.destroy()
})

describe('assessment session routes', () => {
  it('freezes a submitted snapshot and completes one durable deterministic run', async () => {
    const owner = await session()
    const submission = await createSubmission(owner)

    const answer = {
      answer: {
        state: 'answered',
        selectedOptionKeys: ['crm'],
        text: null,
        optionText: {},
      },
      expectedRevision: 0,
      mutationId: randomUUID(),
      questionKey: 'tools',
      submissionId: submission.submissionId,
    }

    const { PUT: saveAnswer } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/answers/[questionKey]/route')

    const { POST: submit } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/submit/route')

    const saved = await saveAnswer(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/answers/tools`,
        {
          body: JSON.stringify(answer),
          headers: {
            cookie: owner.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': owner.csrfToken,
          },
          method: 'PUT',
        }
      ),
      {
        params: Promise.resolve({
          id: submission.submissionId,
          questionKey: 'tools',
        }),
      }
    )

    const submissionInput = {
      expectedRevision: 1,
      mutationId: randomUUID(),
      submissionId: submission.submissionId,
    }

    const submitRequest = () =>
      submit(
        request(
          `/api/assessment/v1/submissions/${submission.submissionId}/submit`,
          {
            body: JSON.stringify(submissionInput),
            headers: {
              cookie: owner.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': owner.csrfToken,
            },
            method: 'POST',
          }
        ),
        { params: Promise.resolve({ id: submission.submissionId }) }
      )
    const firstSubmit = await submitRequest()
    const duplicateSubmit = await submitRequest()

    const frozenWrite = await saveAnswer(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/answers/tools`,
        {
          body: JSON.stringify({
            ...answer,
            expectedRevision: 2,
            mutationId: randomUUID(),
          }),
          headers: {
            cookie: owner.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': owner.csrfToken,
          },
          method: 'PUT',
        }
      ),
      {
        params: Promise.resolve({
          id: submission.submissionId,
          questionKey: 'tools',
        }),
      }
    )

    expect(saved.status).toBe(200)
    expect(firstSubmit.status).toBe(202)

    expect(await duplicateSubmit.json()).toEqual(
      await firstSubmit.clone().json()
    )

    expect(frozenWrite.status).toBe(409)
    expect(await dispatchAssessmentOutbox(payload)).toBe(1)

    await payload.jobs.run({
      queue: 'assessment',
      limit: 1,
      overrideAccess: true,
    })

    const rows = await payload.db.pool.query<{
      outbox_state: string
      run_state: string
      snapshot: { tools: { selectedOptionKeys: string[] } }
    }>(
      `SELECT assessment_outbox.state AS outbox_state, scoring_runs.state AS run_state,
              scoring_runs.answer_snapshot AS snapshot
        FROM assessment_outbox
         JOIN scoring_runs ON assessment_outbox.payload->>'runID' = scoring_runs.id::text
        WHERE scoring_runs.submission_id = (SELECT id FROM submissions WHERE external_id = $1)
          AND assessment_outbox.type = 'deterministic_score'`,
      [submission.submissionId]
    )

    expect(rows.rows).toHaveLength(1)

    expect(rows.rows[0]).toMatchObject({
      outbox_state: 'completed',
      run_state: 'deterministic_done',
      snapshot: { tools: { selectedOptionKeys: ['crm'] } },
    })
  })

  it('enforces origin and CSRF checks', async () => {
    const { POST } =
      await import('@/app/(frontend)/api/assessment/v1/sessions/route')

    const invalidOrigin = await POST(
      request('/api/assessment/v1/sessions', {
        headers: { origin: 'https://attacker.test' },
        method: 'POST',
      })
    )
    const owner = await session()
    const submission = await createSubmission(owner)

    const { PATCH } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/progress/route')

    const missingCsrf = await PATCH(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/progress`,
        {
          body: JSON.stringify({
            currentStep: 1,
            expectedRevision: 0,
            submissionId: submission.submissionId,
          }),
          headers: { cookie: owner.cookie, origin: ORIGIN },
          method: 'PATCH',
        }
      ),
      { params: Promise.resolve({ id: submission.submissionId }) }
    )

    expect(invalidOrigin.status).toBe(403)
    expect(missingCsrf.status).toBe(401)
  })

  it('isolates sessions and safely handles stale and duplicate answer writes', async () => {
    const owner = await session()
    const stranger = await session()
    const submission = await createSubmission(owner)

    const { GET: getSubmission } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/route')

    const { GET: resume } =
      await import('@/app/(frontend)/api/assessment/v1/questionnaires/[id]/resume/route')

    const { PUT: saveAnswer } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/answers/[questionKey]/route')

    const { PATCH: saveProgress } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/progress/route')

    const answer = {
      answer: {
        state: 'answered',
        selectedOptionKeys: ['other'],
        text: null,
        optionText: { other: 'A bespoke process' },
      },
      expectedRevision: 0,
      mutationId: randomUUID(),
      questionKey: 'tools',
      submissionId: submission.submissionId,
    }

    const save = () =>
      saveAnswer(
        request(
          `/api/assessment/v1/submissions/${submission.submissionId}/answers/tools`,
          {
            body: JSON.stringify(answer),
            headers: {
              cookie: owner.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': owner.csrfToken,
            },
            method: 'PUT',
          }
        ),
        {
          params: Promise.resolve({
            id: submission.submissionId,
            questionKey: 'tools',
          }),
        }
      )
    const first = await save()
    const duplicate = await save()

    const strangerRead = await getSubmission(
      request(`/api/assessment/v1/submissions/${submission.submissionId}`, {
        headers: { cookie: stranger.cookie },
      }),
      { params: Promise.resolve({ id: submission.submissionId }) }
    )

    const strangerResume = await resume(
      request(`/api/assessment/v1/questionnaires/${questionnaireID}/resume`, {
        headers: { cookie: stranger.cookie },
      }),
      { params: Promise.resolve({ id: questionnaireID }) }
    )

    const strangerWrite = await saveProgress(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/progress`,
        {
          body: JSON.stringify({
            currentStep: 1,
            expectedRevision: 1,
            submissionId: submission.submissionId,
          }),
          headers: {
            cookie: stranger.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': stranger.csrfToken,
          },
          method: 'PATCH',
        }
      ),
      { params: Promise.resolve({ id: submission.submissionId }) }
    )

    const stale = await saveProgress(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/progress`,
        {
          body: JSON.stringify({
            currentStep: 1,
            expectedRevision: 0,
            submissionId: submission.submissionId,
          }),
          headers: {
            cookie: owner.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': owner.csrfToken,
          },
          method: 'PATCH',
        }
      ),
      { params: Promise.resolve({ id: submission.submissionId }) }
    )

    const mismatch = await saveAnswer(
      request(
        `/api/assessment/v1/submissions/${submission.submissionId}/answers/tools`,
        {
          body: JSON.stringify({
            ...answer,
            answer: {
              state: 'answered',
              selectedOptionKeys: ['crm'],
              text: null,
              optionText: {},
            },
          }),
          headers: {
            cookie: owner.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': owner.csrfToken,
          },
          method: 'PUT',
        }
      ),
      {
        params: Promise.resolve({
          id: submission.submissionId,
          questionKey: 'tools',
        }),
      }
    )

    const [concurrentProgress, concurrentAnswer] = await Promise.all([
      saveProgress(
        request(
          `/api/assessment/v1/submissions/${submission.submissionId}/progress`,
          {
            body: JSON.stringify({
              currentStep: 2,
              expectedRevision: 1,
              submissionId: submission.submissionId,
            }),
            headers: {
              cookie: owner.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': owner.csrfToken,
            },
            method: 'PATCH',
          }
        ),
        { params: Promise.resolve({ id: submission.submissionId }) }
      ),
      saveAnswer(
        request(
          `/api/assessment/v1/submissions/${submission.submissionId}/answers/tools`,
          {
            body: JSON.stringify({
              ...answer,
              answer: {
                state: 'answered',
                selectedOptionKeys: ['crm'],
                text: null,
                optionText: {},
              },
              expectedRevision: 1,
              mutationId: randomUUID(),
            }),
            headers: {
              cookie: owner.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': owner.csrfToken,
            },
            method: 'PUT',
          }
        ),
        {
          params: Promise.resolve({
            id: submission.submissionId,
            questionKey: 'tools',
          }),
        }
      ),
    ])

    const ownedResume = await resume(
      request(`/api/assessment/v1/questionnaires/${questionnaireID}/resume`, {
        headers: { cookie: owner.cookie },
      }),
      { params: Promise.resolve({ id: questionnaireID }) }
    )
    const ownedResumeBody = await ownedResume.json()

    expect(first.status).toBe(200)
    expect(await duplicate.json()).toEqual(await first.clone().json())
    expect(strangerRead.status).toBe(404)
    expect(await strangerResume.json()).toBeNull()
    expect(strangerWrite.status).toBe(404)
    expect(stale.status).toBe(409)
    expect(mismatch.status).toBe(409)

    expect([concurrentProgress.status, concurrentAnswer.status].sort()).toEqual(
      [200, 409]
    )

    expect(ownedResumeBody.revision).toBe(2)

    expect(ownedResumeBody.answers.tools.selectedOptionKeys).toEqual(
      concurrentAnswer.status === 200 ? ['crm'] : ['other']
    )
  })
})
