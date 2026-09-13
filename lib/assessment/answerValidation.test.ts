import { describe, expect, it } from 'vitest'

import { validateAnswer } from '../../server/assessment/answerValidation'
import { questionnaireDefinitionSchema } from '../../server/content/definition'

const definition = questionnaireDefinitionSchema.parse({
  schemaVersion: 1,
  categories: [{ key: 'operations', label: 'Operations', order: 0 }],
  questions: [
    {
      key: 'tools',
      number: 1,
      categoryKey: 'operations',
      prompt: 'Which tools do you use?',
      type: 'multi',
      required: true,
      instructions: null,
      maxSelections: 2,
      options: [
        { key: 'none', label: 'None', exclusive: true, requiresText: false },
        { key: 'other', label: 'Other', exclusive: false, requiresText: true },
        { key: 'crm', label: 'CRM', exclusive: false, requiresText: false },
      ],
    },
  ],
})

describe('validateAnswer', () => {
  it('rejects unknown, exclusive, and missing required option text', () => {
    expect(
      validateAnswer({
        definition,
        questionKey: 'tools',
        answer: {
          state: 'answered',
          selectedOptionKeys: ['none', 'crm'],
          text: null,
          optionText: {},
        },
      })
    ).toEqual(['An exclusive option cannot be combined with other options'])

    expect(
      validateAnswer({
        definition,
        questionKey: 'tools',
        answer: {
          state: 'answered',
          selectedOptionKeys: ['other'],
          text: null,
          optionText: {},
        },
      })
    ).toEqual(['A selected option requires accompanying text'])
  })

  it('accepts selected required option text and skipped answers', () => {
    expect(
      validateAnswer({
        definition,
        questionKey: 'tools',
        answer: {
          state: 'answered',
          selectedOptionKeys: ['other'],
          text: null,
          optionText: { other: 'A bespoke process' },
        },
      })
    ).toEqual([])

    expect(
      validateAnswer({
        definition,
        questionKey: 'tools',
        answer: {
          state: 'skipped',
          selectedOptionKeys: [],
          text: null,
          optionText: {},
        },
      })
    ).toEqual([])
  })
})
