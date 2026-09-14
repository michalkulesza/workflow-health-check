import type { GeminiProvider } from './gemini'
import type { NarrativeProvider } from './narrative'

type ProviderScenario = 'complete' | 'clarification'

const scenario = (): ProviderScenario | null => {
  if (
    process.env.NODE_ENV !== 'test' ||
    process.env.RUN_INTEGRATION_TESTS !== 'true'
  ) {
    return null
  }

  const value = process.env.ASSESSMENT_TEST_PROVIDER_SCENARIO

  return value === 'complete' || value === 'clarification' ? value : null
}

export const createTestGeminiProvider = (): GeminiProvider | null => {
  const selectedScenario = scenario()

  if (!selectedScenario) {
    return null
  }

  return {
    async evaluate(request) {
      const clarification = request.answers.find((answer) =>
        answer.questionKey.startsWith('clarification-')
      )
      const evidence = request.answers.find(
        (answer) => answer.questionKey === 'q11'
      )

      if (!evidence) {
        throw new Error('Test provider requires the q11 answer')
      }

      if (selectedScenario === 'clarification' && !clarification) {
        return {
          level: null,
          score: null,
          confidence: 0.4,
          themes: ['Missing outcome'],
          explanation: 'The initial fictional evidence needs one clarification.',
          insufficientInformation: true,
          evidence: [{ questionKey: evidence.questionKey, excerpt: evidence.answer }],
          followUpQuestion: 'What changed after you tried to improve this?',
        }
      }

      return {
        level: 2,
        score: 0.25,
        confidence: 0.9,
        themes: ['Manual coordination'],
        explanation: 'The fictional evidence describes recurring manual work.',
        insufficientInformation: false,
        evidence: [{ questionKey: evidence.questionKey, excerpt: evidence.answer }],
        followUpQuestion: null,
      }
    },
  }
}

export const createTestNarrativeProvider = (): NarrativeProvider | null => {
  if (!scenario()) {
    return null
  }

  return {
    async narrate(input) {
      const evidence = input.answers.find((answer) => answer.questionKey === 'q11')

      if (!evidence) {
        throw new Error('Test provider requires the q11 answer')
      }

      return {
        summary: 'The fictional respondent has clear workflow priorities.',
        priorities: input.categories
          .filter((category) => ['project', 'people'].includes(category.categoryKey))
          .map((category) => ({
          categoryKey: category.categoryKey,
          explanation: `The fictional evidence shows friction in ${category.categoryLabel}.`,
          firstStep: 'Record the next action and owner in one shared place.',
          evidence: [{ questionKey: evidence.questionKey, excerpt: evidence.answer }],
          })),
      }
    },
  }
}
