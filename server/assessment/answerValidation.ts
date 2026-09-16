import {
  REQUIRED_TEXT_MIN_LENGTH,
  type AnswerValue,
} from '@/lib/assessment/contracts'
import type { QuestionnaireDefinition } from '@/server/content/definition'

export const validateAnswer = ({
  answer,
  definition,
  questionKey,
}: {
  answer: AnswerValue
  definition: QuestionnaireDefinition
  questionKey: string
}): string[] => {
  const question = definition.questions.find(
    (candidate) => candidate.key === questionKey
  )

  if (!question) {
    return ['Question does not exist in this questionnaire version']
  }

  if (answer.state === 'skipped') {
    return []
  }

  if (question.type === 'text') {
    if (
      answer.selectedOptionKeys.length > 0 ||
      Object.keys(answer.optionText).length
    ) {
      return ['Text questions cannot contain selected options or option text']
    }

    const text = answer.text?.trim()

    if (!text) return ['An answered text question requires text']
    if (question.required && text.length < REQUIRED_TEXT_MIN_LENGTH)
      return [
        `Required text answers must be at least ${REQUIRED_TEXT_MIN_LENGTH} characters long`,
      ]

    return []
  }

  if (answer.text !== null) {
    return ['Choice questions cannot contain free text']
  }

  const selected = new Set(answer.selectedOptionKeys)

  if (selected.size !== answer.selectedOptionKeys.length) {
    return ['An option can be selected only once']
  }

  if (question.type === 'single' && selected.size !== 1) {
    return ['Choose exactly one option']
  }

  if (
    question.type === 'multi' &&
    question.maxSelections !== null &&
    selected.size > question.maxSelections
  ) {
    return [`Choose at most ${question.maxSelections} options`]
  }

  const options = new Map(
    question.options.map((option) => [option.key, option])
  )

  for (const key of selected) {
    if (!options.has(key)) {
      return ['Answer contains an unknown option']
    }
  }

  const exclusive = [...selected].some((key) => options.get(key)?.exclusive)

  if (exclusive && selected.size !== 1) {
    return ['An exclusive option cannot be combined with other options']
  }

  for (const [key, text] of Object.entries(answer.optionText)) {
    const option = options.get(key)

    if (!selected.has(key) || !option?.requiresText || !text.trim()) {
      return [
        'Option text is allowed only for a selected option that requires it',
      ]
    }
  }

  for (const key of selected) {
    const option = options.get(key)

    if (option?.requiresText && !answer.optionText[key]?.trim()) {
      return ['A selected option requires accompanying text']
    }
  }

  return []
}
