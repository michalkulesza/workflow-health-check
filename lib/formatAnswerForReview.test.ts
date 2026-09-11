import { describe, expect, it } from 'vitest'

import { questions } from './fixtures'
import { formatAnswerForReview } from './formatAnswerForReview'

const getQuestion = (questionId: string) => {
  const question = questions.find(({ id }) => id === questionId)

  if (!question) {
    throw new Error(`Missing question fixture: ${questionId}`)
  }

  return question
}

describe('formatAnswerForReview', () => {
  it('formats selected option labels and accompanying text', () => {
    const answer = {
      selected: ['notion', 'elsewhere'],
      otherText: { elsewhere: 'A shared studio board' },
    }

    expect(formatAnswerForReview(getQuestion('q5'), answer)).toBe(
      'Notion / Airtable, Somewhere else: A shared studio board'
    )
  })

  it('formats text answers and treats empty answers as missing', () => {
    expect(
      formatAnswerForReview(getQuestion('q11'), { text: '  Chasing files  ' })
    ).toBe('Chasing files')

    expect(
      formatAnswerForReview(getQuestion('q14'), { text: '   ' })
    ).toBeNull()

    expect(formatAnswerForReview(getQuestion('q14'))).toBeNull()
  })

  it('ignores stale option IDs from persisted prototype data', () => {
    expect(
      formatAnswerForReview(getQuestion('q5'), { selected: ['removed-option'] })
    ).toBeNull()
  })
})
