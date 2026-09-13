import type { GlobalConfig } from 'payload'

export const LandingPage: GlobalConfig = {
  slug: 'landing-page',
  admin: { group: 'Content' },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'pageTitle', type: 'text', required: true, maxLength: 160 },
    {
      name: 'metaDescription',
      type: 'textarea',
      required: true,
      maxLength: 320,
    },
    { name: 'headline', type: 'text', required: true, maxLength: 320 },
    { name: 'supporting', type: 'textarea', required: true, maxLength: 2_000 },
    { name: 'audienceTitle', type: 'text', required: true, maxLength: 160 },
    { name: 'audience', type: 'textarea', required: true, maxLength: 2_000 },
    {
      name: 'steps',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 160 },
        { name: 'text', type: 'textarea', required: true, maxLength: 2_000 },
      ],
    },
    { name: 'buttonLabel', type: 'text', required: true, maxLength: 120 },
    {
      name: 'questionnaire',
      type: 'relationship',
      relationTo: 'questionnaires',
      required: true,
    },
  ],
}
