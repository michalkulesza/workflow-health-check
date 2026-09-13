import {
  categories,
  landingContent,
  QUESTIONNAIRE_ID,
  questions,
} from '../lib/fixtures'
import { questionnaireDefinitionSchema } from '../server/content/definition'
import { publishQuestionnaire } from '../server/content/publishQuestionnaire'
import { loadPayload } from './payloadRuntime'

const definition = questionnaireDefinitionSchema.parse({
  schemaVersion: 1,
  categories: categories.map((category, index) => ({
    key: category.id,
    label: category.name,
    order: index,
    scored: category.scored,
    maxPoints: category.maxPoints,
    attentionThreshold: category.attentionThreshold,
    minimumCoverage: 0.6,
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
      value: option.value ?? null,
      penalty: question.id === 'q8' ? (option.value ?? null) : null,
      notApplicable: option.notApplicable ?? false,
    })),
    scoring: scoringForQuestion(question),
  })),
  aiEvaluations: [
    {
      key: 'creative-friction',
      categoryKey: 'friction',
      evaluationQuestionKeys: ['q11', 'q12', 'q13'],
      contextQuestionKeys: ['q1', 'q2', 'q3', 'q14', 'q15', 'q16'],
      rubricVersion: 'creative-friction-v1-draft',
      promptVersion: 'creative-friction-v1',
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      levels: [
        { level: 1, description: 'Reactive and repeatedly losing control.' },
        { level: 2, description: 'Some structure, but unreliable.' },
        { level: 3, description: 'Partly reliable, with recurring gaps.' },
        { level: 4, description: 'Reliable with bounded weaknesses.' },
        { level: 5, description: 'Reliable and demonstrably resilient.' },
      ],
      weight: 1,
    },
  ],
})

function scoringForQuestion(question: (typeof questions)[number]) {
  switch (question.strategy) {
    case 'single_choice_value':
      return { strategy: question.strategy, weight: 1 } as const
    case 'multi_select_count':
      return {
        strategy: question.strategy,
        weight: 1,
        curve: [
          { atLeast: 1, value: 0.9 },
          { atLeast: 2, value: 0.8 },
          { atLeast: 3, value: 0.7 },
          { atLeast: 4, value: 0.6 },
          { atLeast: 5, value: 0.5 },
          { atLeast: 6, value: 0.4 },
          { atLeast: 7, value: 0.3 },
          { atLeast: 8, value: 0.2 },
          { atLeast: 9, value: 0.1 },
          { atLeast: 10, value: 0 },
        ],
        exclusiveValue: 1,
      } as const
    case 'multi_select_weighted':
      return {
        strategy: question.strategy,
        weight: 1,
        penaltyDenominator: 16.5,
        exclusiveValue: 1,
      } as const
    case 'multi_select_quality_quantity':
      return {
        strategy: question.strategy,
        weight: 1,
        qualityWeight: 0.6,
        quantityWeight: 0.4,
        quantityCurve: [
          { atLeast: 1, value: 1 },
          { atLeast: 2, value: 0.8 },
          { atLeast: 3, value: 0.55 },
          { atLeast: 4, value: 0.3 },
          { atLeast: 5, value: 0 },
        ],
        singletonOverride: { optionKey: 'head', value: 0 },
      } as const
    case 'ai_rubric':
      return { strategy: question.strategy, weight: 1 } as const
    case 'none':
      return { strategy: 'none', weight: 0 } as const
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

main().catch((error: unknown) => {
  console.error('Foundation seed failed.')

  if (error instanceof Error) {
    console.error(error.message)
  }

  process.exitCode = 1
})
