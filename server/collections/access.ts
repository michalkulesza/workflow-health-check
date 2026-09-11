import type { CollectionConfig } from 'payload'

export const adminOnlyAccess: CollectionConfig['access'] = {
  admin: ({ req }) => Boolean(req.user),
  create: ({ req }) => Boolean(req.user),
  read: ({ req }) => Boolean(req.user),
  update: ({ req }) => Boolean(req.user),
  delete: ({ req }) => Boolean(req.user),
}
