import type { Report } from '@/lib/assessment/contracts'
import type { QuestionnaireDefinition } from '@/server/content/definition'

export interface StoredCategoryResult {
  categoryKey: string
  components: {
    questionKey: string
    score: number | null | 'na'
    weight: number
  }[]
}

export interface StoredAIEvaluation {
  evaluationKey: string
  state: 'complete' | 'insufficient' | 'waiting_for_input' | 'pending'
  output: { score: number | null } | null
}

export interface AggregatedCategory {
  categoryKey: string
  normalized: number | null
  points: number | null
  coverage: number | null
  eligible: boolean
  components: StoredCategoryResult['components']
}

export const aggregateCategories = ({
  definition,
  evaluations,
  results,
}: {
  definition: QuestionnaireDefinition
  evaluations: StoredAIEvaluation[]
  results: StoredCategoryResult[]
}): AggregatedCategory[] =>
  definition.categories
    .filter((category) => category.scored)
    .map((category) => {
      const deterministic =
        results.find((result) => result.categoryKey === category.key)
          ?.components ?? []

      const aiComponents = definition.aiEvaluations
        .filter((evaluation) => evaluation.categoryKey === category.key)
        .map((evaluation) => {
          const output = evaluations.find(
            (candidate) => candidate.evaluationKey === evaluation.key
          )
          const score = output?.output?.score

          return {
            questionKey: `ai:${evaluation.key}`,
            score:
              output?.state === 'complete' &&
              score !== null &&
              score !== undefined
                ? score
                : null,
            weight: evaluation.weight,
          }
        })
      const components = [...deterministic, ...aiComponents]

      const applicable = components.filter(
        (component) => component.score !== 'na'
      )

      const usable = applicable.filter(
        (component): component is typeof component & { score: number } =>
          typeof component.score === 'number'
      )

      const applicableWeight = applicable.reduce(
        (total, component) => total + component.weight,
        0
      )

      const usableWeight = usable.reduce(
        (total, component) => total + component.weight,
        0
      )

      const coverage =
        applicableWeight === 0 ? null : usableWeight / applicableWeight

      const normalized =
        usableWeight === 0
          ? null
          : usable.reduce(
              (total, component) => total + component.score * component.weight,
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

export const pendingReport = (pendingCategories: string[]): Report => ({
  status: 'pending',
  analysisComplete: false,
  priorities: [],
  summary: 'Your assessment is still being analyzed.',
  pendingCategories,
})

export const noMajorIssuesReport = (): Report => ({
  status: 'complete',
  analysisComplete: true,
  priorities: [],
  summary:
    'No major workflow issues were identified from the available evidence.',
  pendingCategories: [],
})
