import { describe, expect, it } from 'vitest'

import { getScoringDebugRows } from './scoringDebug'

describe('scoring debug rows', () => {
  it('explains weighted and quality calculations from live answers', () => {
    const rows = getScoringDebugRows({
      q5: { selected: ['notion', 'drive'] },
      q8: { selected: ['follow-up', 'version'] },
    })
    const q5 = rows.find(({ questionId }) => questionId === 'q5')
    const q8 = rows.find(({ questionId }) => questionId === 'q8')

    expect(q5?.normalizedScore).toBeCloseTo(0.86)
    expect(q5?.calculation).toContain('0.6 × 0.9 average quality')
    expect(q8?.normalizedScore).toBeCloseTo(0.7273)
    expect(q8?.calculation).toContain('4.5 total penalty ÷ 16.5')
  })

  it('distinguishes context, grouped AI, and not-applicable answers', () => {
    const rows = getScoringDebugRows({ q10: { selected: ['na'] } })

    expect(
      rows.find(({ questionId }) => questionId === 'q1')?.calculation
    ).toContain('Context only')

    expect(
      rows.find(({ questionId }) => questionId === 'q11')?.calculation
    ).toContain('grouped AI rubric')

    expect(
      rows.find(({ questionId }) => questionId === 'q10')?.calculation
    ).toContain('excluded from the category denominator')
  })
})
