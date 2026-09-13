import type { CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'

export const AnonymousSessions: CollectionConfig = {
  slug: 'anonymous-sessions',
  admin: { useAsTitle: 'tokenHash' },
  access: adminOnlyAccess,
  fields: [
    { name: 'tokenHash', type: 'text', required: true, unique: true },
    { name: 'csrfTokenHash', type: 'text', required: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'lastSeenAt', type: 'date', required: true },
  ],
}
