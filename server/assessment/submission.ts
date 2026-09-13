import type { Payload } from 'payload'

import {
  answerValueSchema,
  submissionSchema,
  type Submission,
} from '@/lib/assessment/contracts'

const relationID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value as { id: unknown }

    return typeof id === 'number' ? id : null
  }

  return null
}

const loadAnswers = async (payload: Payload, submissionID: number) => {
  const answers = await payload.find({
    collection: 'answers',
    where: { submission: { equals: submissionID } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  return Object.fromEntries(
    answers.docs.map((answer) => [
      answer.questionKey,
      answerValueSchema.parse({
        state: answer.state,
        selectedOptionKeys: answer.selectedOptionKeys,
        text: answer.text ?? null,
        optionText: answer.optionText,
      }),
    ])
  )
}

export const toSubmissionDTO = async ({
  includeAnswers = true,
  payload,
  submission,
}: {
  includeAnswers?: boolean
  payload: Payload
  submission: {
    externalId: string
    id: number
    questionnaireVersion: unknown
    revision: number
    currentStep: number
    state: string
  }
}): Promise<Submission> => {
  const versionID = relationID(submission.questionnaireVersion)

  if (versionID === null) {
    throw new Error('Submission is missing its questionnaire version')
  }

  const version = await payload.findByID({
    collection: 'questionnaire-versions',
    id: versionID,
    depth: 0,
    overrideAccess: true,
  })
  const questionnaireID = relationID(version.questionnaire)

  if (questionnaireID === null) {
    throw new Error('Questionnaire version is missing its questionnaire')
  }

  const questionnaire = await payload.findByID({
    collection: 'questionnaires',
    id: questionnaireID,
    depth: 0,
    overrideAccess: true,
  })

  return submissionSchema.parse({
    submissionId: submission.externalId,
    questionnaireId: questionnaire.publicId,
    versionId: String(version.id),
    revision: submission.revision,
    currentStep: submission.currentStep,
    state: submission.state,
    answers: includeAnswers ? await loadAnswers(payload, submission.id) : {},
    clarification: await loadClarification(payload, submission.id),
  })
}

const loadClarification = async (
  payload: Payload,
  submissionID: number
): Promise<{ evaluationKey: string; prompt: string } | null> => {
  const result = await payload.db.pool.query<{
    evaluation_key: string
    clarification_prompt: string
  }>(
    `SELECT evaluation.evaluation_key, evaluation.clarification_prompt
       FROM scoring_ai_evaluations evaluation
       JOIN scoring_runs run ON run.id = evaluation.scoring_run_id
      WHERE run.submission_id = $1
        AND evaluation.state = 'waiting_for_input'
      ORDER BY run.run_number DESC
      LIMIT 1`,
    [submissionID]
  )
  const clarification = result.rows[0]

  return clarification
    ? {
        evaluationKey: clarification.evaluation_key,
        prompt: clarification.clarification_prompt,
      }
    : null
}
