import { describe, expect, it } from 'vitest'

import { aiEvaluationOutputSchema } from './gemini'

const output = {
  level: 3,
  score: 0.5,
  confidence: 0.7,
  themes: ['tracking'],
  explanation: 'A weekly list helps, but changes are still missed.',
  insufficientInformation: false,
  evidence: [{ questionKey: 'q13', excerpt: 'changes are still missed' }],
  followUpQuestion: null,
}

describe('Gemini evaluation output boundary', () => {
  it('accepts an exact five-level score and rejects mismatched model output', () => {
    expect(aiEvaluationOutputSchema.parse(output)).toMatchObject({ score: 0.5 })

    expect(
      aiEvaluationOutputSchema.safeParse({ ...output, score: 0.75 }).success
    ).toBe(false)
  })

  it('permits insufficient evidence only without a fabricated numeric score', () => {
    expect(
      aiEvaluationOutputSchema.safeParse({
        ...output,
        level: null,
        score: null,
        insufficientInformation: true,
        followUpQuestion:
          'Describe one recent project change and how you tracked it.',
      }).success
    ).toBe(true)

    expect(
      aiEvaluationOutputSchema.safeParse({
        ...output,
        level: null,
        insufficientInformation: true,
      }).success
    ).toBe(false)
  })
})
