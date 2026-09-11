import { describe, expect, it } from 'vitest'
import { questions } from './fixtures'
import { scoreQuestion } from './scoring'
const q = (id: string) => questions.find((x) => x.id === id)!

describe('configured scoring', () => {
  it('scores Q5 quality and quantity examples', () => {
    expect(
      scoreQuestion(q('q5'), { selected: ['notion', 'drive'] })
    ).toBeCloseTo(0.86)

    expect(scoreQuestion(q('q5'), { selected: ['email', 'dm'] })).toBeCloseTo(
      0.455
    )

    expect(scoreQuestion(q('q5'), { selected: ['head'] })).toBe(0)

    expect(
      scoreQuestion(q('q5'), { selected: ['notion', 'head'] })
    ).toBeCloseTo(0.62)
  })

  it('scores penalties without an extra multiplier', () =>
    expect(
      scoreQuestion(q('q8'), { selected: ['follow-up', 'version'] })
    ).toBeCloseTo(0.72727))

  it('handles manual tasks and not applicable', () => {
    expect(scoreQuestion(q('q9'), { selected: ['admin-0', 'admin-1'] })).toBe(
      0.8
    )

    expect(scoreQuestion(q('q10'), { selected: ['na'] })).toBe('na')
  })
})
