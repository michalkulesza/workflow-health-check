import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const AssessmentOutbox: CollectionConfig = {
  slug: 'assessment-outbox',
  admin: { useAsTitle: 'workKey' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['workKey'], unique: true }],
  fields: [
    { name: 'workKey', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        'deterministic_score',
        'ai_evaluation',
        'category_aggregation',
        'narrative',
        'report_email',
      ],
    },
    {
      name: 'payload',
      type: 'json',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'state',
      type: 'select',
      required: true,
      options: ['pending', 'leased', 'dispatched', 'completed'],
      defaultValue: 'pending',
    },
    {
      name: 'attempts',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    { name: 'leaseToken', type: 'text', admin: { readOnly: true } },
    { name: 'leaseExpiresAt', type: 'date', admin: { readOnly: true } },
    { name: 'payloadJobId', type: 'number', admin: { readOnly: true } },
  ],
}
