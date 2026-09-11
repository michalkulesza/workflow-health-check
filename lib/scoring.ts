import { categories, questions } from './fixtures'
import { Answer, Answers, Question } from './types'

export const clamp = (value: number) => Math.min(1, Math.max(0, value))
export function scoreQuestion(
  question: Question,
  answer?: Answer
): number | null | 'na' {
  const selected = answer?.selected ?? []

  if (!answer || (!selected.length && !answer.text?.trim())) {
    return null
  }

  const opts = selected
    .map((id) => question.options?.find((option) => option.id === id))
    .filter(Boolean)

  if (opts.some((option) => option?.notApplicable)) {
    return 'na'
  }

  switch (question.strategy) {
    case 'single_choice_value':
      return opts[0]?.value ?? null
    case 'multi_select_weighted':
      return opts.some((x) => x?.exclusive)
        ? 1
        : clamp(1 - opts.reduce((sum, x) => sum + (x?.value ?? 0), 0) / 16.5)
    case 'multi_select_count':
      return opts.some((x) => x?.exclusive)
        ? 1
        : clamp(1 - selected.length / 10)
    case 'multi_select_quality_quantity': {
      if (selected.length === 1 && selected[0] === 'head') {
        return 0
      }

      const quantity =
        selected.length === 1
          ? 1
          : selected.length === 2
            ? 0.8
            : selected.length === 3
              ? 0.55
              : selected.length === 4
                ? 0.3
                : 0

      const quality =
        opts.reduce((sum, x) => sum + (x?.value ?? 0), 0) / selected.length

      return clamp(0.6 * quality + 0.4 * quantity)
    }
    default:
      return null
  }
}
export function deterministicScores(answers: Answers) {
  return categories
    .filter((c) => c.scored && c.id !== 'friction')
    .map((category) => {
      const qs = questions.filter(
        (q) => q.categoryId === category.id && q.strategy !== 'none'
      )
      const scored = qs.map((q) => scoreQuestion(q, answers[q.id]))
      const applicable = scored.filter((x) => x !== 'na')

      const usable = applicable.filter(
        (x): x is number => typeof x === 'number'
      )
      const coverage = applicable.length ? usable.length / applicable.length : 0

      const normalized = usable.length
        ? usable.reduce((a, b) => a + b, 0) / usable.length
        : null

      return {
        categoryId: category.id,
        normalized,
        points: normalized === null ? null : normalized * category.maxPoints,
        coverage,
        eligible:
          normalized !== null &&
          coverage >= 0.6 &&
          normalized < category.attentionThreshold,
      }
    })
}
