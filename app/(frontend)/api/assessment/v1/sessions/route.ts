import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  createAnonymousSession,
  csrfCookieName,
  getAnonymousSession,
  isValidCsrfToken,
  sessionCookieName,
} from '@/server/assessment/session'
import { isAllowedAssessmentOrigin } from '@/server/assessment/origin'

const cookieValue = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1]

export const POST = async (request: Request) => {
  if (!isAllowedAssessmentOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid request origin' } },
      { status: 403 }
    )
  }

  const payload = await getPayload({ config })

  const existingSession = await getAnonymousSession({
    payload,
    sessionToken: cookieValue(request, sessionCookieName),
  })
  const csrfToken = cookieValue(request, csrfCookieName)

  if (
    existingSession &&
    isValidCsrfToken({
      expectedHash: existingSession.csrfTokenHash,
      token: csrfToken,
    })
  ) {
    return NextResponse.json(
      { csrfToken, expiresAt: existingSession.expiresAt },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const session = await createAnonymousSession(payload)

  const response = NextResponse.json(
    { csrfToken: session.csrfToken, expiresAt: session.expiresAt },
    { headers: { 'Cache-Control': 'no-store' }, status: 201 }
  )
  const isProduction = process.env.NODE_ENV === 'production'

  response.cookies.set({
    name: sessionCookieName,
    value: session.sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    expires: new Date(session.expiresAt),
  })

  response.cookies.set({
    name: csrfCookieName,
    value: session.csrfToken,
    httpOnly: false,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    expires: new Date(session.expiresAt),
  })

  return response
}
