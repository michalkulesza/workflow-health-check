import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const ScoringRuns: CollectionConfig = {
  slug: 'scoring-runs',
  admin: { useAsTitle: 'runNumber' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['submission', 'runNumber'], unique: true }],
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'submissions',
      required: true,
    },
    {
      name: 'questionnaireVersion',
      type: 'relationship',
      relationTo: 'questionnaire-versions',
      required: true,
    },
    { name: 'runNumber', type: 'number', required: true, min: 1 },
    {
      name: 'state',
      type: 'select',
      required: true,
      options: ['queued', 'processing', 'deterministic_done', 'failed'],
    },
    {
      name: 'answerSnapshot',
      type: 'json',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'answerSnapshotHash',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'definitionSnapshot',
      type: 'json',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'engineVersion',
      type: 'text',
      required: true,
      defaultValue: 'deterministic-v1',
      admin: { readOnly: true },
    },
  ],
}
