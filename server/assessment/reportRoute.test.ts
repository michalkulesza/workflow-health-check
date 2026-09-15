import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('payload', () => ({
  getPayload: async () => ({ db: { pool: { query } } }),
}))

vi.mock('@/payload.config', () => ({ default: {} }))

vi.mock('@/server/assessment/ownership', () => ({
  getRequestSession: async () => ({ id: 1 }),
  getOwnedSubmission: async () => ({ id: 18 }),
}))

import { GET } from '@/app/(frontend)/api/assessment/v1/submissions/[id]/report/route'

describe('report polling during a retry', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    'queued',
    'processing',
    'ai_pending',
    'waiting_for_input',
    'deterministic_done',
    'partial',
    'complete',
  ])(
    'returns the current status for %s despite an earlier saved report',
    async (state) => {
      const terminal = ['partial', 'complete'].includes(state)

      query.mockResolvedValue({
        rows: [
          {
            state,
            definition_snapshot: { categories: [{ key: 'friction' }] },
            report: {
              status: terminal ? state : 'partial',
              analysisComplete: state === 'complete',
              summary: 'Saved report',
              priorities: [],
              pendingCategories: [],
            },
          },
        ],
      })

      const response = await GET(
        new Request(
          'http://localhost/api/assessment/v1/submissions/test/report'
        ),
        {
          params: Promise.resolve({ id: 'test' }),
        }
      )

      expect(response.status).toBe(200)

      expect(await response.json()).toMatchObject({
        status: terminal ? state : 'pending',
      })
    }
  )
})
