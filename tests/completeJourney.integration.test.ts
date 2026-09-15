import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { once } from 'node:events'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import { createFoundationDefinition } from '@/server/content/foundationDefinition'
import { publishQuestionnaire } from '@/server/content/publishQuestionnaire'
import { runReportEmail } from '@/server/jobs/reportEmailTask'

const ORIGIN = 'http://assessment.test'
const fixtureText =
  'I repeatedly chase approvals in scattered messages and lose the current project status.'

type Session = { cookie: string; csrfToken: string }
type Journey = { session: Session; submissionID: string; versionID: string }

let payload: Payload
let draftVersionID: number
let questionnaireID: string
let versionID: string

const request = (path: string, init?: RequestInit) =>
  new Request(`${ORIGIN}${path}`, init)

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) })

const workerCycle = async () => {
  const child = execFile(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/worker.ts', '--once'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASSESSMENT_TEST_PROVIDER_SCENARIO:
          process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO ?? 'complete',
        NODE_ENV: 'test',
        RUN_INTEGRATION_TESTS: 'true',
      },
      windowsHide: true,
    }
  )
  const [code] = (await once(child, 'close')) as [number]

  expect(code).toBe(0)
}

const completeWorkerRun = async () => {
  for (let cycle = 0; cycle < 6; cycle += 1) {
    await workerCycle()
  }
}

const createSession = async (): Promise<Session> => {
  const { POST } =
    await import('@/app/(frontend)/api/assessment/v1/sessions/route')
  const response = await POST(
    request('/api/assessment/v1/sessions', {
      headers: { origin: ORIGIN },
      method: 'POST',
    })
  )
  const body = (await response.json()) as { csrfToken: string }
  const token = /assessment_session=([^;]+)/.exec(
    response.headers.get('set-cookie') ?? ''
  )?.[1]

  if (!token) {
    throw new Error('Session response did not set an assessment session cookie')
  }

  return { cookie: `assessment_session=${token}`, csrfToken: body.csrfToken }
}

const createJourney = async (
  displayedVersionID = versionID
): Promise<Journey> => {
  const session = await createSession()
  const { POST } =
    await import('@/app/(frontend)/api/assessment/v1/submissions/route')
  const response = await POST(
    request('/api/assessment/v1/submissions', {
      body: JSON.stringify({
        displayedVersionId: displayedVersionID,
        questionnaireId: questionnaireID,
      }),
      headers: { cookie: session.cookie, origin: ORIGIN },
      method: 'POST',
    })
  )

  expect(response.status).toBe(201)
  const body = (await response.json()) as { submissionId: string }

  return {
    session,
    submissionID: body.submissionId,
    versionID: displayedVersionID,
  }
}

const answers = [
  ['q1', ['producer'], null],
  ['q2', ['6-10'], null],
  ['q3', ['time-0', 'time-1', 'time-2', 'time-3'], null],
  ['q4', ['reconstruct'], null],
  ['q5', ['head'], null],
  ['q6', ['depends'], null],
  ['q7', ['forget'], null],
  [
    'q8',
    [
      'unclear',
      'follow-up',
      'forget',
      'lost',
      'repeat',
      'version',
      'deadlines',
    ],
    null,
  ],
  [
    'q9',
    [
      'admin-0',
      'admin-1',
      'admin-2',
      'admin-3',
      'admin-4',
      'admin-5',
      'admin-6',
      'admin-7',
      'admin-8',
    ],
    null,
  ],
  ['q10', ['react'], null],
  ['q11', [], fixtureText],
  ['q12', [], 'I copy the same project updates into several tools each week.'],
  [
    'q13',
    [],
    'A deadline changed without a shared record, so I reconstructed the plan from messages.',
  ],
  ['q14', [], 'I would delegate follow-up reminders.'],
  ['q15', [], 'I need one reliable project-status system.'],
  ['q16', ['time-4'], null],
] as const

const saveAllAnswers = async (journey: Journey) => {
  const { PUT } =
    await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/answers/[questionKey]/route')
  let revision = 0

  for (const [questionKey, selectedOptionKeys, text] of answers) {
    const response = await PUT(
      request(
        `/api/assessment/v1/submissions/${journey.submissionID}/answers/${questionKey}`,
        {
          body: JSON.stringify({
            answer: {
              state: 'answered',
              selectedOptionKeys,
              text,
              optionText: {},
            },
            expectedRevision: revision,
            mutationId: randomUUID(),
            questionKey,
            submissionId: journey.submissionID,
          }),
          headers: {
            cookie: journey.session.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': journey.session.csrfToken,
          },
          method: 'PUT',
        }
      ),
      { params: Promise.resolve({ id: journey.submissionID, questionKey }) }
    )

    expect(response.status).toBe(200)
    revision += 1
  }

  return revision
}

const submitJourney = async (journey: Journey, revision: number) => {
  const { POST } =
    await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/submit/route')
  const response = await POST(
    request(`/api/assessment/v1/submissions/${journey.submissionID}/submit`, {
      body: JSON.stringify({
        expectedRevision: revision,
        mutationId: randomUUID(),
        submissionId: journey.submissionID,
      }),
      headers: {
        cookie: journey.session.cookie,
        origin: ORIGIN,
        'x-assessment-csrf': journey.session.csrfToken,
      },
      method: 'POST',
    }),
    routeParams(journey.submissionID)
  )

  expect(response.status).toBe(202)
  return (await response.json()) as { runId: string }
}

beforeAll(async () => {
  const { default: config } = await import('@/payload.config')

  payload = await getPayload({ config })
  questionnaireID = randomUUID()
  const questionnaire = await payload.create({
    collection: 'questionnaires',
    data: { name: 'Complete journey integration', publicId: questionnaireID },
    overrideAccess: true,
  })
  const definition = createFoundationDefinition('fixture-model')
  const draft = await payload.create({
    collection: 'questionnaire-versions',
    data: {
      questionnaire: questionnaire.id,
      status: 'draft',
      categories: definition.categories,
      questions: definition.questions,
      aiEvaluations: definition.aiEvaluations,
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
  draftVersionID = published.draftVersionID
})

afterAll(async () => {
  if (payload) {
    await payload.destroy()
  }
})

describe('complete 16-question assessment journey', () => {
  it('persists a grounded report through the separate durable worker', async () => {
    process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO = 'complete'
    const journey = await createJourney()
    const revision = await saveAllAnswers(journey)
    const submitted = await submitJourney(journey, revision)

    await completeWorkerRun()

    const result = await payload.db.pool.query<{
      answer_snapshot: Record<string, { text: string | null }>
      questionnaire_version_id: number
      report: { priorities: { categoryKey: string }[]; status: string }
      run_id: number
      state: string
    }>(
      `SELECT run.id AS run_id, run.questionnaire_version_id, run.answer_snapshot,
              run.report, run.state
         FROM scoring_runs run
         JOIN submissions submission ON submission.id = run.submission_id
        WHERE submission.external_id = $1`,
      [journey.submissionID]
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      answer_snapshot: { q11: { text: fixtureText } },
      questionnaire_version_id: Number(journey.versionID),
      report: {
        priorities: [{ categoryKey: 'project' }, { categoryKey: 'people' }],
        status: 'complete',
      },
      run_id: Number(submitted.runId),
      state: 'complete',
    })

    const scores = await payload.db.pool.query<{
      category_key: string
      normalized: string
      points: string
    }>(
      `SELECT category_key, normalized, points FROM scoring_results
        WHERE scoring_run_id = $1 ORDER BY category_key`,
      [submitted.runId]
    )
    const scoreByCategory = Object.fromEntries(
      scores.rows.map((score) => [
        score.category_key,
        { normalized: Number(score.normalized), points: Number(score.points) },
      ])
    )

    expect(scoreByCategory.project).toMatchObject({ normalized: 0, points: 0 })
    expect(scoreByCategory.people?.normalized).toBeCloseTo(1 / 22)
    expect(scoreByCategory.admin).toMatchObject({ normalized: 0.05, points: 1 })
    expect(scoreByCategory.friction).toMatchObject({
      normalized: 0.25,
      points: 5,
    })

    const { GET: getReport } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/report/route')
    const report = await getReport(
      request(`/api/assessment/v1/submissions/${journey.submissionID}/report`, {
        headers: { cookie: journey.session.cookie },
      }),
      routeParams(journey.submissionID)
    )

    expect(report.status).toBe(200)
    expect((await report.json()) as { status: string }).toMatchObject({
      status: 'complete',
    })

    const { POST: captureContact } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/contact/route')
    const contactRequest = () =>
      captureContact(
        request(
          `/api/assessment/v1/submissions/${journey.submissionID}/contact`,
          {
            body: JSON.stringify({
              email: 'complete-journey@example.test',
              idempotencyKey: '7c2f4494-2cbb-4cd7-825c-53b0b8973b94',
              message: 'Fictional contact request for the integration journey.',
              name: 'Integration respondent',
              submissionId: journey.submissionID,
            }),
            headers: {
              cookie: journey.session.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': journey.session.csrfToken,
            },
            method: 'POST',
          }
        ),
        routeParams(journey.submissionID)
      )

    expect((await contactRequest()).status).toBe(202)
    expect((await contactRequest()).status).toBe(202)

    const leads = await payload.db.pool.query<{
      email: string
      id: number
      scoring_run_id: number
      stage: string
      submission_id: number
    }>(
      `SELECT lead.id, lead.submission_id, lead.scoring_run_id, lead.email, lead.stage
         FROM leads lead
         JOIN submissions submission ON submission.id = lead.submission_id
        WHERE submission.external_id = $1`,
      [journey.submissionID]
    )

    expect(leads.rows).toEqual([
      expect.objectContaining({
        email: 'complete-journey@example.test',
        scoring_run_id: Number(submitted.runId),
        stage: 'new',
      }),
    ])

    const leadID = leads.rows[0]?.id

    if (!leadID) {
      throw new Error('Contact capture did not create a lead')
    }

    await payload.update({
      collection: 'leads',
      id: leadID,
      data: {
        notes: 'Verified by the Step 6 integration journey.',
        stage: 'contacted',
      },
      overrideAccess: true,
    })
    const updatedLead = await payload.findByID({
      collection: 'leads',
      id: leadID,
      depth: 0,
      overrideAccess: true,
    })

    expect(updatedLead).toMatchObject({
      notes: 'Verified by the Step 6 integration journey.',
      stage: 'contacted',
    })
  })

  it('asks exactly one clarification and completes after its persisted response', async () => {
    process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO = 'clarification'
    const journey = await createJourney()
    const revision = await saveAllAnswers(journey)
    await submitJourney(journey, revision)

    await workerCycle()
    await workerCycle()

    const { POST: submitClarification } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/clarification/route')
    const clarificationRequest = () =>
      submitClarification(
        request(
          `/api/assessment/v1/submissions/${journey.submissionID}/clarification`,
          {
            body: JSON.stringify({
              evaluationKey: 'creative-friction',
              response: 'I now record approvals in one shared project tracker.',
              submissionId: journey.submissionID,
            }),
            headers: {
              cookie: journey.session.cookie,
              origin: ORIGIN,
              'x-assessment-csrf': journey.session.csrfToken,
            },
            method: 'POST',
          }
        ),
        routeParams(journey.submissionID)
      )

    const accepted = await clarificationRequest()
    expect(accepted.status).toBe(202)
    expect((await clarificationRequest()).status).toBe(409)

    await completeWorkerRun()

    const evaluation = await payload.db.pool.query<{
      attempts: string
      clarification_response: string
      state: string
    }>(
      `SELECT evaluation.state, evaluation.attempts, evaluation.clarification_response
         FROM scoring_ai_evaluations evaluation
         JOIN scoring_runs run ON run.id = evaluation.scoring_run_id
         JOIN submissions submission ON submission.id = run.submission_id
        WHERE submission.external_id = $1`,
      [journey.submissionID]
    )

    expect(evaluation.rows).toHaveLength(1)
    expect(evaluation.rows[0]).toMatchObject({
      attempts: '2',
      clarification_response:
        'I now record approvals in one shared project tracker.',
      state: 'complete',
    })
  })

  it('keeps a report notification separate from leads and captures one report-ready delivery', async () => {
    process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO = 'complete'
    const journey = await createJourney()
    const revision = await saveAllAnswers(journey)
    await submitJourney(journey, revision)

    const { POST: requestNotification } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/notification/route')
    const response = await requestNotification(
      request(
        `/api/assessment/v1/submissions/${journey.submissionID}/notification`,
        {
          body: JSON.stringify({
            email: 'notification-only@example.test',
            purpose: 'report_ready',
            submissionId: journey.submissionID,
          }),
          headers: {
            cookie: journey.session.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': journey.session.csrfToken,
          },
          method: 'POST',
        }
      ),
      routeParams(journey.submissionID)
    )

    expect(response.status).toBe(202)

    const beforeDelivery = await payload.db.pool.query<{
      leads: string
      notifications: string
    }>(
      `SELECT
         (SELECT count(*) FROM leads lead
            JOIN submissions submission ON submission.id = lead.submission_id
           WHERE submission.external_id = $1) AS leads,
         (SELECT count(*) FROM notification_requests request
            JOIN submissions submission ON submission.id = request.submission_id
           WHERE submission.external_id = $1) AS notifications`,
      [journey.submissionID]
    )

    expect(beforeDelivery.rows).toEqual([{ leads: '0', notifications: '1' }])

    for (let cycle = 0; cycle < 4; cycle += 1) {
      await workerCycle()
    }

    const delivery = await payload.db.pool.query<{
      delivery_id: number
      outbox_id: number
      state: string
    }>(
      `SELECT delivery.id AS delivery_id, outbox.id AS outbox_id, delivery.state
         FROM email_deliveries delivery
         JOIN submissions submission ON submission.id = delivery.submission_id
         JOIN assessment_outbox outbox
           ON outbox.type = 'report_email'
          AND (outbox.payload->>'deliveryID')::integer = delivery.id
        WHERE submission.external_id = $1`,
      [journey.submissionID]
    )

    expect(delivery.rows).toEqual([
      expect.objectContaining({ state: 'pending' }),
    ])

    const row = delivery.rows[0]

    if (!row) {
      throw new Error('Report notification delivery was not queued')
    }

    const originalEmailFrom = process.env.EMAIL_FROM
    const originalOrigin = process.env.APP_ORIGIN
    const originalPepper = process.env.REPORT_TOKEN_PEPPER
    const captured: {
      from: string
      html: string
      idempotencyKey: string
      subject: string
      to: string
    }[] = []

    try {
      process.env.EMAIL_FROM = 'Reports <reports@example.test>'
      process.env.APP_ORIGIN = ORIGIN
      process.env.REPORT_TOKEN_PEPPER = 'test-report-token-pepper-32-chars'

      await runReportEmail({
        deliveryID: row.delivery_id,
        outboxID: row.outbox_id,
        payload,
        resend: {
          async send(email) {
            captured.push(email)
            return { id: 'captured-report-ready-email' }
          },
        },
      })
    } finally {
      process.env.EMAIL_FROM = originalEmailFrom
      process.env.APP_ORIGIN = originalOrigin
      process.env.REPORT_TOKEN_PEPPER = originalPepper
    }

    expect(captured).toEqual([
      expect.objectContaining({
        from: 'Reports <reports@example.test>',
        html: expect.stringContaining(`${ORIGIN}/report/`),
        subject: 'Your workflow health report is ready',
        to: 'notification-only@example.test',
      }),
    ])

    const afterDelivery = await payload.db.pool.query<{
      grants: string
      leads: string
      provider_message_id: string
      state: string
    }>(
      `SELECT delivery.state, delivery.provider_message_id,
              (SELECT count(*) FROM report_grants report_grant
                WHERE report_grant.email_delivery_id = delivery.id) AS grants,
              (SELECT count(*) FROM leads lead
                JOIN submissions submission ON submission.id = lead.submission_id
               WHERE submission.external_id = $1) AS leads
         FROM email_deliveries delivery
         JOIN submissions submission ON submission.id = delivery.submission_id
        WHERE submission.external_id = $1`,
      [journey.submissionID]
    )

    expect(afterDelivery.rows).toEqual([
      {
        grants: '1',
        leads: '0',
        provider_message_id: 'captured-report-ready-email',
        state: 'sent',
      },
    ])
  })

  it('reclaims expired work after a worker restart and records terminal provider retries', async () => {
    process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO = 'terminal_failure'
    const journey = await createJourney()
    const revision = await saveAllAnswers(journey)
    const submitted = await submitJourney(journey, revision)

    await payload.db.pool.query(
      `UPDATE assessment_outbox
          SET state = 'leased', lease_token = 'interrupted-worker',
              lease_expires_at = now() - interval '1 second'
        WHERE type = 'deterministic_score' AND payload->>'runID' = $1`,
      [submitted.runId]
    )

    await completeWorkerRun()

    const recovery = await payload.db.pool.query<{
      attempts: string
      has_error: boolean
      report: { status: string }
      state: string
      total_tried: string
    }>(
      `SELECT outbox.attempts, job.total_tried, job.has_error, run.state, run.report
         FROM assessment_outbox outbox
         JOIN payload_jobs job ON job.id = outbox.payload_job_id
         JOIN scoring_runs run ON run.id = (outbox.payload->>'runID')::integer
        WHERE outbox.type = 'ai_evaluation' AND run.id = $1`,
      [submitted.runId]
    )

    expect(recovery.rows).toEqual([
      expect.objectContaining({
        attempts: '1',
        has_error: false,
        report: expect.objectContaining({ status: 'partial' }),
        state: 'partial',
        total_tried: '1',
      }),
    ])
  })

  it('pins an in-progress submission to its original publication after a review edit', async () => {
    const originalJourney = await createJourney()
    const initialRevision = await saveAllAnswers(originalJourney)
    const originalDraft = await payload.findByID({
      collection: 'questionnaire-versions',
      id: draftVersionID,
      depth: 0,
      overrideAccess: true,
    })
    const originalQuestion = originalDraft.questions?.find(
      (question) => question.key === 'q11'
    )

    if (!originalQuestion) {
      throw new Error('Foundation draft has no q11 question')
    }

    await payload.update({
      collection: 'questionnaire-versions',
      id: draftVersionID,
      data: {
        questions: originalDraft.questions?.map((question) =>
          question.key === 'q11'
            ? { ...question, prompt: `${question.prompt} (version two)` }
            : question
        ),
      },
      overrideAccess: true,
    })
    const questionnaireResult = await payload.find({
      collection: 'questionnaires',
      where: { publicId: { equals: questionnaireID } },
      limit: 1,
      overrideAccess: true,
    })
    const currentQuestionnaireID = questionnaireResult.docs[0]?.id

    if (!currentQuestionnaireID) {
      throw new Error('Foundation questionnaire was not found')
    }

    const published = await publishQuestionnaire({
      payload,
      questionnaireID: Number(currentQuestionnaireID),
      draftVersionID,
    })

    const { PUT: saveAnswer } =
      await import('@/app/(frontend)/api/assessment/v1/submissions/[id]/answers/[questionKey]/route')
    const revisedText =
      'I now keep approvals in one shared project-status record.'
    const saved = await saveAnswer(
      request(
        `/api/assessment/v1/submissions/${originalJourney.submissionID}/answers/q11`,
        {
          body: JSON.stringify({
            answer: {
              state: 'answered',
              selectedOptionKeys: [],
              text: revisedText,
              optionText: {},
            },
            expectedRevision: initialRevision,
            mutationId: randomUUID(),
            questionKey: 'q11',
            submissionId: originalJourney.submissionID,
          }),
          headers: {
            cookie: originalJourney.session.cookie,
            origin: ORIGIN,
            'x-assessment-csrf': originalJourney.session.csrfToken,
          },
          method: 'PUT',
        }
      ),
      {
        params: Promise.resolve({
          id: originalJourney.submissionID,
          questionKey: 'q11',
        }),
      }
    )
    expect(saved.status).toBe(200)
    const submitted = await submitJourney(originalJourney, initialRevision + 1)

    const pinned = await payload.db.pool.query<{
      answer_snapshot: { q11: { text: string } }
      definition_snapshot: { questions: { key: string; prompt: string }[] }
      questionnaire_version_id: number
    }>(
      'SELECT answer_snapshot, definition_snapshot, questionnaire_version_id FROM scoring_runs WHERE id = $1',
      [submitted.runId]
    )
    expect(pinned.rows).toHaveLength(1)
    expect(pinned.rows[0]?.answer_snapshot.q11.text).toBe(revisedText)
    expect(pinned.rows[0]?.questionnaire_version_id).toBe(Number(versionID))
    expect(
      pinned.rows[0]?.definition_snapshot.questions.find(
        (question) => question.key === 'q11'
      )?.prompt
    ).toBe(originalQuestion.prompt)

    const newJourney = await createJourney(String(published.publishedVersionID))
    const newSubmission = await payload.db.pool.query<{
      questionnaire_version_id: number
    }>(
      'SELECT questionnaire_version_id FROM submissions WHERE external_id = $1',
      [newJourney.submissionID]
    )
    expect(newSubmission.rows).toEqual([
      { questionnaire_version_id: published.publishedVersionID },
    ])
  })
})
