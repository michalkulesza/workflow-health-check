import { NextResponse } from 'next/server'

export const assessmentError = (
  code: string,
  message: string,
  status: number,
  revision?: number,
  fieldErrors?: Record<string, string[]>
) =>
  NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors === undefined ? {} : { fieldErrors }),
        requestId: crypto.randomUUID(),
      },
      ...(revision === undefined ? {} : { revision }),
    },
    { headers: { 'Cache-Control': 'no-store' }, status }
  )
