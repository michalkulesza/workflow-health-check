import { publishQuestionnaire } from '../server/content/publishQuestionnaire'
import { loadPayload } from './payloadRuntime'

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

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message
) => {
  if (!condition) {
    throw new Error(message)
  }
}

const main = async () => {
  const payload = await loadPayload()

  try {
    const questionnaires = await payload.find({
      collection: 'questionnaires',
      limit: 1,
      overrideAccess: true,
    })
    const questionnaire = questionnaires.docs[0]

    assert(questionnaire, 'A seeded questionnaire is required')
    const firstDraftID = relationID(questionnaire.draftVersion)

    assert(firstDraftID, 'A seeded questionnaire draft is required')

    const firstPublication = await publishQuestionnaire({
      payload,
      questionnaireID: questionnaire.id,
      draftVersionID: firstDraftID,
    })

    const published = await payload.findByID({
      collection: 'questionnaire-versions',
      id: firstPublication.publishedVersionID,
      overrideAccess: true,
    })

    assert(published.status === 'published', 'Publication status was not saved')

    assert(
      published.contentHash.length === 64,
      'Published content hash is not a SHA-256 digest'
    )

    let immutable = false

    try {
      await payload.update({
        collection: 'questionnaire-versions',
        id: published.id,
        data: { contentHash: 'tampered' },
        overrideAccess: true,
      })
    } catch {
      immutable = true
    }

    assert(immutable, 'Published version accepted a normal update')

    const concurrent = await Promise.allSettled([
      publishQuestionnaire({
        payload,
        questionnaireID: questionnaire.id,
        draftVersionID: firstPublication.draftVersionID,
      }),
      publishQuestionnaire({
        payload,
        questionnaireID: questionnaire.id,
        draftVersionID: firstPublication.draftVersionID,
      }),
    ])

    const successfulPublications = concurrent.filter(
      (result) => result.status === 'fulfilled'
    )

    assert(
      successfulPublications.length === 1,
      'Concurrent publication did not produce exactly one winner'
    )

    console.log(
      'Publication transaction, immutability, and concurrency verified.'
    )
  } finally {
    await payload.destroy()
  }
}

main().catch((error: unknown) => {
  console.error('Publication verification failed.')

  if (error instanceof Error) {
    console.error(error.message)
  }

  process.exitCode = 1
})
