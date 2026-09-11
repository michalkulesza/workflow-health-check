import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  admin: { useAsTitle: 'externalId' },
  access: adminOnlyAccess,
  fields: [
    { name: 'externalId', type: 'text', required: true, unique: true },
    {
      name: 'questionnaireVersion',
      type: 'relationship',
      relationTo: 'questionnaire-versions',
      required: true,
    },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'in_progress',
      options: [
        'in_progress',
        'submitted',
        'processing',
        'awaiting_clarification',
        'ready',
        'partial',
        'failed',
      ],
    },
    {
      name: 'revision',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'currentStep',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
  ],
}
