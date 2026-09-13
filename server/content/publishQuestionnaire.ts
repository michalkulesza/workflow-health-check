import { createLocalReq, type Payload } from 'payload'

import { hashDefinition, questionnaireDefinitionSchema } from './definition'

export class PublicationConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicationConflictError'
  }
}

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

interface PublishQuestionnaireInput {
  payload: Payload
  questionnaireID: number
  draftVersionID: number
}

interface PublishQuestionnaireResult {
  draftVersionID: number
  publishedVersionID: number
  versionNumber: number
}

export const publishQuestionnaire = async ({
  payload,
  questionnaireID,
  draftVersionID,
}: PublishQuestionnaireInput): Promise<PublishQuestionnaireResult> => {
  const transactionID = await payload.db.beginTransaction()

  if (transactionID === null) {
    throw new Error('A database transaction is required to publish content')
  }

  const req = await createLocalReq(
    {
      context: { publishQuestionnaire: true },
      req: { transactionID },
    },
    payload
  )

  try {
    const questionnaire = await payload.findByID({
      collection: 'questionnaires',
      id: questionnaireID,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const activeDraftID = relationID(questionnaire.draftVersion)

    if (activeDraftID !== draftVersionID) {
      throw new PublicationConflictError(
        'This questionnaire draft is no longer the active draft'
      )
    }

    const draft = await payload.findByID({
      collection: 'questionnaire-versions',
      id: draftVersionID,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (draft.status !== 'draft') {
      throw new PublicationConflictError(
        'Only an active draft can be published'
      )
    }

    if (relationID(draft.questionnaire) !== questionnaireID) {
      throw new PublicationConflictError(
        'The draft does not belong to this questionnaire'
      )
    }

    const definition = questionnaireDefinitionSchema.parse({
      schemaVersion: 1,
      categories: draft.categories,
      questions: draft.questions,
    })
    const contentHash = hashDefinition(definition)

    const latestPublished = await payload.find({
      collection: 'questionnaire-versions',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      sort: '-versionNumber',
      where: {
        and: [
          { questionnaire: { equals: questionnaireID } },
          { status: { equals: 'published' } },
        ],
      },
    })
    const latestVersionNumber = latestPublished.docs[0]?.versionNumber ?? 0
    const versionNumber = latestVersionNumber + 1

    const published = await payload.create({
      collection: 'questionnaire-versions',
      data: {
        questionnaire: questionnaireID,
        versionNumber,
        status: 'published',
        categories: definition.categories,
        questions: definition.questions,
        definition,
        contentHash,
        publishedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      req,
    })

    const nextDraft = await payload.create({
      collection: 'questionnaire-versions',
      data: {
        questionnaire: questionnaireID,
        status: 'draft',
        categories: definition.categories,
        questions: definition.questions,
        definition,
        contentHash,
      },
      overrideAccess: true,
      req,
    })

    await payload.update({
      collection: 'questionnaires',
      id: questionnaireID,
      data: {
        currentPublishedVersion: published.id,
        draftVersion: nextDraft.id,
      },
      overrideAccess: true,
      req,
    })

    await payload.db.commitTransaction(transactionID)

    return {
      draftVersionID: nextDraft.id,
      publishedVersionID: published.id,
      versionNumber,
    }
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)

    throw error
  }
}
