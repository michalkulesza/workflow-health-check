import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

import { createTestNarrativeProvider } from './testHarness'
import type { ProviderUsage } from './gemini'

const narrativePrioritySchema = z.object({
  categoryKey: z.string().min(1).max(128),
  explanation: z.string().trim().min(1).max(4_000),
  firstStep: z.string().trim().min(1).max(2_000),
  evidence: z
    .array(
      z.object({
        questionKey: z.string().min(1).max(128),
        excerpt: z.string().min(1).max(1_000),
      })
    )
    .min(1)
    .max(10),
})

export const narrativeOutputSchema = z.object({
  summary: z.string().trim().min(1).max(4_000),
  priorities: z.array(narrativePrioritySchema).min(1).max(2),
})

export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>

export type NarrativeResult = {
  output: NarrativeOutput
  usage: ProviderUsage | null
}

export interface NarrativeProvider {
  narrate(input: {
    categories: {
      categoryKey: string
      categoryLabel: string
      score: number
      maxPoints: number
    }[]
    answers: { questionKey: string; answer: string }[]
  }): Promise<NarrativeOutput | NarrativeResult>
}

const numericUsageValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null

const usageFromResponse = (response: {
  usageMetadata?: unknown
}): ProviderUsage | null => {
  const usage = response.usageMetadata

  if (!usage || typeof usage !== 'object') {
    return null
  }

  const values = usage as Record<string, unknown>

  return {
    cachedContentTokens: numericUsageValue(values.cachedContentTokenCount),
    outputTokens: numericUsageValue(values.candidatesTokenCount),
    promptTokens: numericUsageValue(values.promptTokenCount),
    reasoningTokens: numericUsageValue(values.thoughtsTokenCount),
    totalTokens: numericUsageValue(values.totalTokenCount),
  }
}

export const createNarrativeProvider = (
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL
): NarrativeProvider => {
  const testProvider = createTestNarrativeProvider()

  if (testProvider) {
    return testProvider
  }

  if (!apiKey || !model) {
    throw new Error(
      'GEMINI_API_KEY and GEMINI_MODEL are required for narratives'
    )
  }

  const client = new GoogleGenAI({ apiKey })

  return {
    async narrate(input) {
      const response = await client.models.generateContent({
        model,
        contents: JSON.stringify({
          task: 'Write a grounded, concise workflow report. Select no more than two supplied eligible categories. Do not invent facts or scores.',
          categories: input.categories,
          answers: input.answers,
        }),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              priorities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    categoryKey: { type: 'string' },
                    explanation: { type: 'string' },
                    firstStep: { type: 'string' },
                    evidence: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          questionKey: { type: 'string' },
                          excerpt: { type: 'string' },
                        },
                        required: ['questionKey', 'excerpt'],
                      },
                    },
                  },
                  required: [
                    'categoryKey',
                    'explanation',
                    'firstStep',
                    'evidence',
                  ],
                },
                maxItems: 2,
              },
            },
            required: ['summary', 'priorities'],
          },
          temperature: 0,
          maxOutputTokens: 2_000,
        },
      })

      return {
        output: narrativeOutputSchema.parse(JSON.parse(response.text ?? '')),
        usage: usageFromResponse(response),
      }
    },
  }
}
