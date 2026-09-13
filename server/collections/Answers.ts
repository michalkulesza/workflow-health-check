import { APIError, type CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const Answers: CollectionConfig = {
  slug: 'answers',
  admin: { useAsTitle: 'questionKey' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['submission', 'questionKey'], unique: true }],
  hooks: {
    beforeChange: [
      ({ operation }) => {
        if (operation === 'update') {
          throw new APIError('Assessment answers are immutable', 403)
        }
      },
    ],
    beforeDelete: [
      () => {
        throw new APIError('Assessment answers are immutable', 403)
      },
    ],
  },
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
    },
    { name: 'questionKey', type: 'text', required: true },
    {
      name: 'state',
      type: 'select',
      required: true,
      options: ['answered', 'skipped'],
    },
    { name: 'selectedOptionKeys', type: 'json', required: true },
    { name: 'text', type: 'textarea' },
    { name: 'optionText', type: 'json', required: true },
  ],
}
