import { describe, expect, it } from 'vitest'

import {
  MalformedAssessmentJsonError,
  parseAssessmentJson,
  withAssessmentErrorBoundary,
} from './response'

describe('assessment error boundary', () => {
  it('normalizes a PostgreSQL connectivity failure with a request id', async () => {
    const route = withAssessmentErrorBoundary('/test', async () => {
      const error = Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      })
      throw error
    })
    const response = await route()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.error).toMatchObject({ code: 'temporary_failure' })
    expect(body.error.requestId).toEqual(expect.any(String))
  })

  it('does not classify an application SyntaxError as malformed JSON', async () => {
    const route = withAssessmentErrorBoundary('/test', async () => {
      throw new SyntaxError('application bug')
    })

    expect((await route()).status).toBe(500)
  })

  it('returns a bad request only when request body parsing fails', async () => {
    const route = withAssessmentErrorBoundary(
      '/test',
      async (request: Request) => {
        await parseAssessmentJson(request)

        return Response.json({ ok: true })
      }
    )

    const response = await route(
      new Request('http://localhost/test', { body: '{', method: 'POST' })
    )

    expect(response.status).toBe(400)

    await expect(
      parseAssessmentJson(
        new Request('http://localhost/test', { body: '{', method: 'POST' })
      )
    ).rejects.toBeInstanceOf(MalformedAssessmentJsonError)
  })
})
