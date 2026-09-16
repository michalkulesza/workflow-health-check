import { describe, expect, it } from 'vitest'

import { remainingMinimumDuration } from './timing'

describe('remainingMinimumDuration', () => {
  it('keeps a state visible for its remaining minimum duration', () => {
    expect(remainingMinimumDuration(1_000, 500, 1_300)).toBe(200)
  })

  it('does not add delay after the minimum duration has elapsed', () => {
    expect(remainingMinimumDuration(1_000, 500, 1_600)).toBe(0)
  })
})
