import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  createAnonymousSession,
  csrfCookieName,
  sessionCookieName,
} from '@/server/assessment/session'

const isSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')

  return origin === new URL(request.url).origin
}

export const POST = async (request: Request) => {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Invalid request origin' } },
      { status: 403 }
    )
  }

  const payload = await getPayload({ config })
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
