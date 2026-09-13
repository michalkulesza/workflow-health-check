import { APIError, type CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

const leadStages = ['new', 'contacted', 'in_progress', 'closed'] as const

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    defaultColumns: ['email', 'name', 'stage', 'updatedAt'],
    useAsTitle: 'email',
  },
  access: { ...adminOnlyAccess, delete: () => false },
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create') {
          data.stageHistory = [
            {
              from: null,
              to: data.stage ?? 'new',
              changedAt: new Date().toISOString(),
            },
          ]

          return data
        }

        if (!originalDoc) {
          throw new APIError('Lead history could not be loaded', 409)
        }

        const nextStage = data.stage ?? originalDoc.stage

        const history = Array.isArray(originalDoc.stageHistory)
          ? originalDoc.stageHistory
          : []

        data.stageHistory =
          nextStage === originalDoc.stage
            ? history
            : [
                ...history,
                {
                  from: originalDoc.stage,
                  to: nextStage,
                  changedAt: new Date().toISOString(),
                },
              ]

        return data
      },
    ],
  },
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      name: 'scoringRun',
      type: 'relationship',
      relationTo: 'scoring-runs',
      admin: { readOnly: true },
    },
    { name: 'email', type: 'email', required: true, admin: { readOnly: true } },
    { name: 'name', type: 'text', admin: { readOnly: true } },
    { name: 'message', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'stage',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [...leadStages],
      admin: {
        description: 'Pipeline: New → Contacted → In progress → Closed.',
      },
    },
    { name: 'notes', type: 'textarea' },
    {
      name: 'stageHistory',
      type: 'json',
      required: true,
      defaultValue: [],
      admin: { readOnly: true },
    },
    { name: 'captureMutationId', type: 'text', admin: { readOnly: true } },
    { name: 'capturePayloadHash', type: 'text', admin: { readOnly: true } },
  ],
}
