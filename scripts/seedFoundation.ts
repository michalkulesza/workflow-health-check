import { QUESTIONNAIRE_ID } from '../lib/fixtures'
import { loadPayload } from './payloadRuntime'

const main = async () => {
  const payload = await loadPayload()

  try {
    const existing = await payload.find({
      collection: 'questionnaires',
      where: { publicId: { equals: QUESTIONNAIRE_ID } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length) {
      console.log('Foundation questionnaire already exists; seed is unchanged.')

      return
    }

    const questionnaire = await payload.create({
      collection: 'questionnaires',
      data: { name: 'Workflow Check', publicId: QUESTIONNAIRE_ID },
      overrideAccess: true,
    })

    const version = await payload.create({
      collection: 'questionnaire-versions',
      data: {
        questionnaire: questionnaire.id,
        versionNumber: 1,
        status: 'draft',
        definition: { schemaVersion: 1, questions: [] },
        contentHash: 'foundation-placeholder',
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'questionnaires',
      id: questionnaire.id,
      data: { draftVersion: version.id },
      overrideAccess: true,
    })

    console.log('Foundation questionnaire created.')
  } finally {
    await payload.destroy()
  }
}

main().catch((error: unknown) => {
  console.error('Foundation seed failed.')

  if (error instanceof Error) {
    console.error(error.message)
  }

  process.exitCode = 1
})
