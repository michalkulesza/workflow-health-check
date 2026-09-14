import { landingContent, QUESTIONNAIRE_ID } from '../lib/fixtures'
import { questionnaireDefinitionSchema } from '../server/content/definition'
import { createFoundationDefinition } from '../server/content/foundationDefinition'
import { publishQuestionnaire } from '../server/content/publishQuestionnaire'
import { loadPayload } from './payloadRuntime'

const definition = createFoundationDefinition()

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
          aiEvaluations: definition.aiEvaluations,
          definition,
          contentHash: 'seeded-by-hook',
        },
        overrideAccess: true,
      })

      questionnaire = await payload.update({
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

        const parsedDraftDefinition = questionnaireDefinitionSchema.safeParse(
          draft.definition
        )

        const hasLegacyUnconfiguredScoring =
          parsedDraftDefinition.success &&
          parsedDraftDefinition.data.questions.every(
            (question) => question.scoring.strategy === 'none'
          ) &&
          parsedDraftDefinition.data.categories.every(
            (category) => !category.scored
          )

        if (
          !draft.categories?.length ||
          !draft.questions?.length ||
          hasLegacyUnconfiguredScoring
        ) {
          await payload.update({
            collection: 'questionnaire-versions',
            id: draft.id,
            data: {
              categories: definition.categories,
              questions: definition.questions,
              aiEvaluations: definition.aiEvaluations,
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

    if (!questionnaire.currentPublishedVersion) {
      const draftVersionID = relationID(questionnaire.draftVersion)

      if (!draftVersionID) {
        throw new Error('Foundation questionnaire has no draft to publish')
      }

      await publishQuestionnaire({
        payload,
        questionnaireID: questionnaire.id,
        draftVersionID,
      })

      console.log('Foundation questionnaire published.')
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

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Foundation seed failed.')

    if (error instanceof Error) {
      console.error(error.message)
    }

    process.exit(1)
  })
