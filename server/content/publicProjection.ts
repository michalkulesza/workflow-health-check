import {
  landingSchema,
  questionnaireSchema,
  type Landing,
  type Questionnaire,
} from '@/lib/assessment/contracts'
import { questionnaireDefinitionSchema } from './definition'

const relationID = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id

    return typeof id === 'number' ? id : null
  }

  return null
}

export const toPublicQuestionnaire = ({
  questionnaireID,
  version,
}: {
  questionnaireID: string
  version: { contentHash: string; definition: unknown; id: number }
}): Questionnaire => {
  const definition = questionnaireDefinitionSchema.parse(version.definition)

  return questionnaireSchema.parse({
    questionnaireId: questionnaireID,
    versionId: String(version.id),
    versionHash: version.contentHash,
    categories: definition.categories.map(({ key, label }) => ({ key, label })),
    questions: definition.questions.map((question) => ({
      key: question.key,
      number: question.number,
      categoryKey: question.categoryKey,
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      instructions: question.instructions,
      maxSelections: question.maxSelections,
      options: question.options.map(
        ({ key, label, exclusive, requiresText }) => ({
          key,
          label,
          exclusive,
          requiresText,
        })
      ),
    })),
  })
}

export const toPublicLanding = ({
  landing,
  questionnairePublicID,
}: {
  landing: unknown
  questionnairePublicID: string
}): Landing =>
  landingSchema.parse({
    ...(landing as Record<string, unknown>),
    questionnaireId: questionnairePublicID,
  })

export { relationID }
