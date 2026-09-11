import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const QuestionnaireVersions: CollectionConfig = {
  slug: 'questionnaire-versions',
  admin: { useAsTitle: 'versionNumber' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['questionnaire', 'versionNumber'], unique: true }],
  fields: [
    {
      name: 'questionnaire',
      type: 'relationship',
      relationTo: 'questionnaires',
      required: true,
    },
    { name: 'versionNumber', type: 'number', required: true, min: 1 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
    { name: 'definition', type: 'json', required: true },
    { name: 'contentHash', type: 'text', required: true },
    { name: 'publishedAt', type: 'date' },
  ],
}
