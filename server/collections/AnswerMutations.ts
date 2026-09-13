import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const AnswerMutations: CollectionConfig = {
  slug: 'answer-mutations',
  admin: { useAsTitle: 'mutationId' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['submission', 'mutationId'], unique: true }],
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
    },
    { name: 'mutationId', type: 'text', required: true },
    { name: 'payloadHash', type: 'text', required: true },
    { name: 'resultRevision', type: 'number', required: true, min: 0 },
  ],
}
