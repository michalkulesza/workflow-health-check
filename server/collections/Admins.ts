import { APIError, type CollectionConfig } from 'payload'

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: {
    admin: ({ req }) => Boolean(req.user),
    create: () => false,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ operation, req, data }) => {
        // Payload's first-user endpoint bypasses collection create access.
        // Only the explicit local bootstrap command may create the initial admin.
        if (operation === 'create' && req.context.bootstrapAdmin !== true) {
          throw new APIError(
            'Admin creation requires the local bootstrap command',
            403
          )
        }

        return data
      },
    ],
  },
  fields: [],
}
