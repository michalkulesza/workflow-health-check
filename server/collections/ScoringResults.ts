import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const ScoringResults: CollectionConfig = {
  slug: 'scoring-results',
  admin: { useAsTitle: 'categoryKey' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['scoringRun', 'categoryKey'], unique: true }],
  fields: [
    {
      name: 'scoringRun',
      type: 'relationship',
      relationTo: 'scoring-runs',
      required: true,
    },
    { name: 'categoryKey', type: 'text', required: true },
    { name: 'normalized', type: 'number' },
    { name: 'points', type: 'number' },
    { name: 'coverage', type: 'number' },
    { name: 'eligible', type: 'checkbox', required: true },
    { name: 'components', type: 'json', required: true },
  ],
}
