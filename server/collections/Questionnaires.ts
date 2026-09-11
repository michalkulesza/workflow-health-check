import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const Questionnaires: CollectionConfig = {
  slug: 'questionnaires',
  admin: { useAsTitle: 'name' },
  access: adminOnlyAccess,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'publicId', type: 'text', required: true, unique: true },
    {
      name: 'currentPublishedVersion',
      type: 'relationship',
      relationTo: 'questionnaire-versions',
    },
    {
      name: 'draftVersion',
      type: 'relationship',
      relationTo: 'questionnaire-versions',
    },
  ],
}
