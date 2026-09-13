import { APIError, type CollectionConfig } from 'payload'

import { adminOnlyAccess } from './access'
import {
  hashDefinition,
  questionnaireDefinitionSchema,
} from '../content/definition'

const buildDefinition = (data: Record<string, unknown>) =>
  questionnaireDefinitionSchema.parse({
    schemaVersion: 1,
    categories: data.categories,
    questions: data.questions,
  })

export const QuestionnaireVersions: CollectionConfig = {
  slug: 'questionnaire-versions',
  admin: { useAsTitle: 'versionNumber' },
  access: adminOnlyAccess,
  indexes: [{ fields: ['questionnaire', 'versionNumber'], unique: true }],
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc, req }) => {
        const isPublicationService = req.context.publishQuestionnaire === true

        if (originalDoc?.status === 'published' && !isPublicationService) {
          throw new APIError(
            'Published questionnaire versions are immutable',
            403
          )
        }

        if (data.status === 'published' && !isPublicationService) {
          throw new APIError(
            'Use the publication service to create published questionnaire versions',
            403
          )
        }

        if (operation === 'create' || operation === 'update') {
          const definition = buildDefinition({ ...originalDoc, ...data })

          data.definition = definition
          data.contentHash = hashDefinition(definition)
        }

        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const version = await req.payload.findByID({
          collection: 'questionnaire-versions',
          id,
          overrideAccess: true,
          req,
        })

        if (
          version.status === 'published' &&
          req.context.publishQuestionnaire !== true
        ) {
          throw new APIError(
            'Published questionnaire versions are immutable',
            403
          )
        }
      },
    ],
  },
  fields: [
    {
      name: 'questionnaire',
      type: 'relationship',
      relationTo: 'questionnaires',
      required: true,
    },
    {
      name: 'versionNumber',
      type: 'number',
      min: 1,
      admin: {
        description:
          'Assigned only when this draft becomes a published version.',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
    {
      name: 'categories',
      type: 'array',
      minRows: 1,
      maxRows: 100,
      fields: [
        { name: 'key', type: 'text', required: true, maxLength: 128 },
        { name: 'label', type: 'text', required: true, maxLength: 160 },
        { name: 'order', type: 'number', required: true, min: 0 },
        { name: 'scored', type: 'checkbox', defaultValue: false },
        { name: 'maxPoints', type: 'number', defaultValue: 20, min: 0 },
        {
          name: 'attentionThreshold',
          type: 'number',
          defaultValue: 0.6,
          min: 0,
          max: 1,
        },
        {
          name: 'minimumCoverage',
          type: 'number',
          defaultValue: 0.6,
          min: 0,
          max: 1,
        },
      ],
    },
    {
      name: 'questions',
      type: 'array',
      minRows: 1,
      maxRows: 100,
      fields: [
        { name: 'key', type: 'text', required: true, maxLength: 128 },
        { name: 'number', type: 'number', required: true, min: 1 },
        { name: 'categoryKey', type: 'text', required: true, maxLength: 128 },
        { name: 'prompt', type: 'textarea', required: true, maxLength: 4_000 },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: ['single', 'multi', 'text'],
        },
        { name: 'required', type: 'checkbox', required: true },
        { name: 'instructions', type: 'textarea', maxLength: 2_000 },
        { name: 'maxSelections', type: 'number', min: 1 },
        {
          name: 'options',
          type: 'array',
          maxRows: 100,
          fields: [
            { name: 'key', type: 'text', required: true, maxLength: 128 },
            { name: 'label', type: 'text', required: true, maxLength: 500 },
            { name: 'exclusive', type: 'checkbox', defaultValue: false },
            { name: 'requiresText', type: 'checkbox', defaultValue: false },
            { name: 'value', type: 'number', min: 0, max: 1 },
            { name: 'penalty', type: 'number', min: 0 },
            { name: 'notApplicable', type: 'checkbox', defaultValue: false },
          ],
        },
        {
          name: 'scoring',
          type: 'json',
          required: true,
          defaultValue: { strategy: 'none', weight: 0 },
          admin: {
            description: 'Validated version-specific scoring configuration.',
          },
        },
      ],
    },
    {
      name: 'definition',
      type: 'json',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'contentHash',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    { name: 'publishedAt', type: 'date' },
  ],
}
