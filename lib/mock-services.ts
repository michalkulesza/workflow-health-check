import { landingContent, questions, reportFixtures, VERSION } from './fixtures'
import type { Answers, Progress, ReportResult, Scenario } from './types'

type AnalysisResponse =
  | { clarification: string; result?: never }
  | { result: ReportResult; clarification?: never }

const isProgress = (value: unknown): value is Progress => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.version === VERSION &&
    typeof candidate.answers === 'object' &&
    candidate.answers !== null &&
    Number.isInteger(candidate.step) &&
    Number(candidate.step) >= 0 &&
    Number(candidate.step) < questions.length &&
    ['in-progress', 'review', 'complete'].includes(String(candidate.status)) &&
    typeof candidate.updatedAt === 'string'
  )
}
export interface PrototypeServices {
  loadLanding: () => Promise<typeof landingContent>
  loadQuestionnaire: () => Promise<typeof questions>
  loadProgress: () => Progress | null
  saveProgress: (progress: Progress) => Promise<void>
  analyse: (scenario: Scenario, clarified: boolean) => Promise<AnalysisResponse>
  requestNotification: (email: string, fail: boolean) => Promise<void>
  submitContact: (data: unknown, fail: boolean) => Promise<void>
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export const createMockServices = (id: string): PrototypeServices => {
  const key = `workflow-check:${id}:${VERSION}`

  return {
    loadLanding: async () => landingContent,
    loadQuestionnaire: async () => questions,
    loadProgress: () => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) || 'null')

        return isProgress(parsed) ? parsed : null
      } catch {
        // Corrupt or inaccessible prototype storage starts a fresh assessment.
        return null
      }
    },
    saveProgress: async (p) => {
      await wait(450)
      localStorage.setItem(key, JSON.stringify(p))
    },
    analyse: async (s, clarified) => {
      await wait(s === 'ai-failure' ? 1700 : 900)

      if ((s === 'clarification' || s === 'insufficient') && !clarified) {
        return {
          clarification:
            'Thinking of one recent project, how did you keep track of what needed doing, and what happened when something changed or slipped?',
        }
      }

      return {
        result:
          s === 'one'
            ? reportFixtures.one
            : s === 'healthy'
              ? reportFixtures.healthy
              : s === 'insufficient'
                ? reportFixtures.insufficient
                : s === 'ai-failure' || s === 'notification-error'
                  ? reportFixtures.pending
                  : reportFixtures.two,
      }
    },
    requestNotification: async (_, fail) => {
      await wait(700)

      if (fail) {
        throw Error('notification')
      }
    },
    submitContact: async (_, fail) => {
      await wait(700)

      if (fail) {
        throw Error('contact')
      }
    },
  }
}
export const blankProgress = (): Progress => {
  return {
    version: VERSION,
    answers: {},
    step: 0,
    status: 'in-progress',
    updatedAt: new Date().toISOString(),
  }
}
export const sampleAnswers: Answers = Object.fromEntries(
  questions.map((q) => {
    const options = q.options ?? []
    const option = options[Math.min(2, options.length - 1)]

    return [
      q.id,
      q.type === 'text'
        ? {
            text: 'I keep the essentials moving, but client changes arrive in several places and I still spend time copying updates and chasing approvals.',
          }
        : { selected: option ? [option.id] : [] },
    ]
  })
)
