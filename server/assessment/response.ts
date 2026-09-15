import { NextResponse } from 'next/server'

export const assessmentError = (
  code: string,
  message: string,
  status: number,
  revision?: number,
  fieldErrors?: Record<string, string[]>,
  requestId = crypto.randomUUID()
) =>
  NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors === undefined ? {} : { fieldErrors }),
        requestId,
      },
      ...(revision === undefined ? {} : { revision }),
    },
    { headers: { 'Cache-Control': 'no-store' }, status }
  )

const databaseErrorCodes = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '28P01',
  '53300',
  '57P01',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
])

const databaseFailure = (reason: unknown): boolean => {
  if (typeof reason !== 'object' || reason === null) {
    return false
  }

  const code = Reflect.get(reason, 'code')

  if (typeof code === 'string' && databaseErrorCodes.has(code)) {
    return true
  }

  const message = Reflect.get(reason, 'message')

  return (
    typeof message === 'string' &&
    message.startsWith('Error: cannot connect to Postgres:')
  )
}

/** Applies the assessment JSON contract to unexpected route failures. */
export const withAssessmentErrorBoundary =
  <Args extends readonly unknown[]>(
    routeTemplate: string,
    handler: (...args: Args) => Promise<Response>
  ) =>
  async (...args: Args): Promise<Response> => {
    const requestId = crypto.randomUUID()

    try {
      return await handler(...args)
    } catch (reason) {
      if (reason instanceof MalformedAssessmentJsonError) {
        return assessmentError(
          'bad_request',
          'Invalid request body',
          400,
          undefined,
          undefined,
          requestId
        )
      }

      const category = databaseFailure(reason) ? 'database' : 'unexpected'

      // Deliberately log only correlation and allowlisted diagnostic metadata.
      console.error(
        JSON.stringify({
          category,
          databaseCode:
            typeof reason === 'object' &&
            reason !== null &&
            typeof Reflect.get(reason, 'code') === 'string'
              ? Reflect.get(reason, 'code')
              : undefined,
          requestId,
          route: routeTemplate,
        })
      )

      return assessmentError(
        category === 'database' ? 'temporary_failure' : 'internal_error',
        category === 'database'
          ? 'The assessment service is temporarily unavailable. Please try again.'
          : 'The assessment service could not complete this request.',
        category === 'database' ? 503 : 500,
        undefined,
        undefined,
        requestId
      )
    }
  }

export class MalformedAssessmentJsonError extends Error {
  constructor() {
    super('Malformed request JSON')
  }
}

/** Distinguishes request-body parsing failures from application SyntaxErrors. */
export const parseAssessmentJson = async (
  request: Request
): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    throw new MalformedAssessmentJsonError()
  }
}
