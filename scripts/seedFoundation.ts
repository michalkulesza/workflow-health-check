import {
  categories,
  landingContent,
  QUESTIONNAIRE_ID,
  questions,
} from '../lib/fixtures'
import { questionnaireDefinitionSchema } from '../server/content/definition'
import { loadPayload } from './payloadRuntime'

const definition = questionnaireDefinitionSchema.parse({
  schemaVersion: 1,
  categories: categories.map((category, index) => ({
    key: category.id,
    label: category.name,
    order: index,
  })),
  questions: questions.map((question) => ({
    key: question.id,
    number: question.number,
    categoryKey: question.categoryId,
    prompt: question.prompt,
    type: question.type,
    required: question.required,
    instructions: question.instructions ?? null,
    maxSelections: question.maxSelections ?? null,
    options: (question.options ?? []).map((option) => ({
      key: option.id,
      label: option.label,
      exclusive: option.exclusive ?? false,
      requiresText: option.requiresText ?? false,
    })),
  })),
})

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

const main = async () => {
  const payload = await loadPayload()

  try {
    const existing = await payload.find({
      collection: 'questionnaires',
      where: { publicId: { equals: QUESTIONNAIRE_ID } },
      limit: 1,
      overrideAccess: true,
    })
    let questionnaire = existing.docs[0]

    if (!questionnaire) {
      questionnaire = await payload.create({
        collection: 'questionnaires',
        data: { name: 'Workflow Check', publicId: QUESTIONNAIRE_ID },
        overrideAccess: true,
      })

      const version = await payload.create({
        collection: 'questionnaire-versions',
        data: {
          questionnaire: questionnaire.id,
          status: 'draft',
          categories: definition.categories,
          questions: definition.questions,
          definition,
          contentHash: 'seeded-by-hook',
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
    } else {
      const draftVersionID = relationID(questionnaire.draftVersion)

      if (draftVersionID) {
        const draft = await payload.findByID({
          collection: 'questionnaire-versions',
          id: draftVersionID,
          depth: 0,
          overrideAccess: true,
        })

        if (!draft.categories?.length || !draft.questions?.length) {
          await payload.update({
            collection: 'questionnaire-versions',
            id: draft.id,
            data: {
              categories: definition.categories,
              questions: definition.questions,
            },
            overrideAccess: true,
          })

          console.log('Foundation questionnaire draft upgraded.')
        } else {
          console.log(
            'Foundation questionnaire already exists; seed is unchanged.'
          )
        }
      }
    }

    const landing = await payload.findGlobal({
      slug: 'landing-page',
      overrideAccess: true,
    })

    if (!landing.pageTitle) {
      await payload.updateGlobal({
        slug: 'landing-page',
        data: {
          ...landingContent,
          questionnaire: questionnaire.id,
        },
        overrideAccess: true,
      })

      console.log('Foundation landing page created.')
    }
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
