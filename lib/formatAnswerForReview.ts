import type { Answer, Question } from './types'

export const formatAnswerForReview = (
  question: Question,
  answer?: Answer
): string | null => {
  if (question.type === 'text') {
    return answer?.text?.trim() || null
  }

  const selectedLabels = (answer?.selected ?? []).flatMap((optionId) => {
    const option = question.options?.find(({ id }) => id === optionId)

    if (!option) {
      return []
    }

    const detail = answer?.otherText?.[optionId]?.trim()

    return detail ? `${option.label}: ${detail}` : option.label
  })

  return selectedLabels.length > 0 ? selectedLabels.join(', ') : null
}
