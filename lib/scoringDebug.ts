import { categories, questions } from './fixtures'
import { scoreQuestion } from './scoring'
import type { Answer, Answers, Question } from './types'

export interface ScoringDebugRow {
  questionId: string
  questionNumber: number
  categoryName: string
  strategy: Question['strategy']
  input: string
  calculation: string
  normalizedScore: number | null
  pointContribution: number | null
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: 4 }).format(value)

const selectedOptions = (question: Question, answer?: Answer) =>
  (answer?.selected ?? []).flatMap((optionId) => {
    const option = question.options?.find(({ id }) => id === optionId)

    return option ? [option] : []
  })

const explainCalculation = (question: Question, answer?: Answer) => {
  const options = selectedOptions(question, answer)

  if (question.strategy === 'none') {
    return 'Context only; this answer does not add points.'
  }

  if (question.strategy === 'ai_rubric') {
    return 'Q11–Q13 form one grouped AI rubric score; the prototype simulates it after submission.'
  }

  if (options.length === 0) {
    return 'No usable score yet.'
  }

  if (options.some(({ notApplicable }) => notApplicable)) {
    return 'Not applicable; excluded from the category denominator.'
  }

  if (question.strategy === 'single_choice_value') {
    return `Selected option value = ${formatNumber(options[0].value ?? 0)}`
  }

  if (question.strategy === 'multi_select_weighted') {
    if (options.some(({ exclusive }) => exclusive)) {
      return 'Exclusive smooth option selected = 1'
    }

    const penalty = options.reduce(
      (sum, option) => sum + (option.value ?? 0),
      0
    )

    return `clamp(1 − ${formatNumber(penalty)} total penalty ÷ 16.5)`
  }

  if (question.strategy === 'multi_select_count') {
    if (options.some(({ exclusive }) => exclusive)) {
      return 'Exclusive “None of these” selected = 1'
    }

    return `clamp(1 − ${options.length} selected tasks ÷ 10)`
  }

  if (options.length === 1 && options[0].id === 'head') {
    return '“Mostly in my head” selected alone: configured override = 0'
  }

  const quality =
    options.reduce((sum, option) => sum + (option.value ?? 0), 0) /
    options.length

  const quantity =
    options.length === 1
      ? 1
      : options.length === 2
        ? 0.8
        : options.length === 3
          ? 0.55
          : options.length === 4
            ? 0.3
            : 0

  return `clamp(0.6 × ${formatNumber(quality)} average quality + 0.4 × ${formatNumber(quantity)} quantity)`
}

export const getScoringDebugRows = (answers: Answers): ScoringDebugRow[] => {
  const usableCounts = new Map<string, number>()

  for (const category of categories.filter(({ scored }) => scored)) {
    const usableCount = questions
      .filter(
        ({ categoryId, strategy }) =>
          categoryId === category.id &&
          strategy !== 'none' &&
          strategy !== 'ai_rubric'
      )
      .map((question) => scoreQuestion(question, answers[question.id]))
      .filter((score): score is number => typeof score === 'number').length

    usableCounts.set(category.id, usableCount)
  }

  return questions.map((question) => {
    const answer = answers[question.id]
    const options = selectedOptions(question, answer)
    const category = categories.find(({ id }) => id === question.categoryId)
    const score = scoreQuestion(question, answer)
    const normalizedScore = typeof score === 'number' ? score : null
    const usableCount = usableCounts.get(question.categoryId) ?? 0

    const pointContribution =
      normalizedScore !== null && category?.scored && usableCount > 0
        ? (normalizedScore * category.maxPoints) / usableCount
        : null

    return {
      questionId: question.id,
      questionNumber: question.number,
      categoryName: category?.name ?? question.categoryId,
      strategy: question.strategy,
      input:
        question.type === 'text'
          ? answer?.text?.trim() || 'No answer'
          : options.map(({ label }) => label).join(', ') || 'No selection',
      calculation: explainCalculation(question, answer),
      normalizedScore,
      pointContribution,
    }
  })
}
