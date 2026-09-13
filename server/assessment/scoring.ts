import type { AnswerValue } from '@/lib/assessment/contracts'
import type { QuestionnaireDefinition } from '@/server/content/definition'

export type DeterministicScore = number | null | 'na'

export class InvalidScoringAnswerError extends Error {}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const curveValue = (
  curve: { atLeast: number; value: number }[],
  count: number
): number =>
  [...curve]
    .sort((left, right) => right.atLeast - left.atLeast)
    .find((bucket) => count >= bucket.atLeast)?.value ?? 0

export const scoreDeterministicQuestion = (
  question: QuestionnaireDefinition['questions'][number],
  answer?: AnswerValue
): DeterministicScore => {
  if (!answer || answer.state === 'skipped') {
    return null
  }

  if (
    question.scoring.strategy === 'none' ||
    question.scoring.strategy === 'ai_rubric'
  ) {
    return null
  }

  const selected = answer.selectedOptionKeys.map((key) => {
    const option = question.options.find((candidate) => candidate.key === key)

    if (!option) {
      throw new InvalidScoringAnswerError(
        `Unknown option ${key} for ${question.key}`
      )
    }

    return option
  })

  if (!selected.length) {
    return null
  }

  if (selected.some((option) => option.notApplicable)) {
    return 'na'
  }

  switch (question.scoring.strategy) {
    case 'single_choice_value':
      return selected[0]?.value ?? null
    case 'multi_select_count':
      return selected.some((option) => option.exclusive)
        ? question.scoring.exclusiveValue
        : curveValue(question.scoring.curve, selected.length)
    case 'multi_select_weighted':
      return selected.some((option) => option.exclusive)
        ? question.scoring.exclusiveValue
        : clamp(
            1 -
              selected.reduce((sum, option) => sum + (option.penalty ?? 0), 0) /
                question.scoring.penaltyDenominator
          )
    case 'multi_select_quality_quantity': {
      if (
        selected.length === 1 &&
        selected[0]?.key === question.scoring.singletonOverride?.optionKey
      ) {
        return question.scoring.singletonOverride.value
      }

      const quality =
        selected.reduce((sum, option) => sum + (option.value ?? 0), 0) /
        selected.length

      return clamp(
        question.scoring.qualityWeight * quality +
          question.scoring.quantityWeight *
            curveValue(question.scoring.quantityCurve, selected.length)
      )
    }
  }
}

export interface CategoryScore {
  categoryKey: string
  normalized: number | null
  points: number | null
  coverage: number | null
  eligible: boolean
  components: {
    questionKey: string
    score: DeterministicScore
    weight: number
  }[]
}

export const scoreDeterministicCategories = (
  definition: QuestionnaireDefinition,
  answers: Record<string, AnswerValue | undefined>
): CategoryScore[] =>
  definition.categories
    .filter((category) => category.scored)
    .map((category) => {
      const units = definition.questions.filter(
        (question) =>
          question.categoryKey === category.key &&
          !['none', 'ai_rubric'].includes(question.scoring.strategy)
      )

      const components = units.map((question) => ({
        questionKey: question.key,
        score: scoreDeterministicQuestion(question, answers[question.key]),
        weight: question.scoring.weight,
      }))

      const applicable = components.filter(
        (component) => component.score !== 'na'
      )

      const usable = applicable.filter(
        (component): component is typeof component & { score: number } =>
          typeof component.score === 'number'
      )

      const applicableWeight = applicable.reduce(
        (sum, component) => sum + component.weight,
        0
      )

      const usableWeight = usable.reduce(
        (sum, component) => sum + component.weight,
        0
      )

      const coverage =
        applicableWeight === 0 ? null : usableWeight / applicableWeight

      const normalized =
        usableWeight === 0
          ? null
          : usable.reduce(
              (sum, component) => sum + component.score * component.weight,
              0
            ) / usableWeight

      return {
        categoryKey: category.key,
        normalized,
        points: normalized === null ? null : normalized * category.maxPoints,
        coverage,
        eligible:
          normalized !== null &&
          coverage !== null &&
          coverage >= category.minimumCoverage &&
          normalized < category.attentionThreshold,
        components,
      }
    })
