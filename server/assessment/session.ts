import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import type { Payload } from 'payload'

const SESSION_COOKIE = 'assessment_session'
const CSRF_COOKIE = 'assessment_csrf'
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 365

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')
const token = (): string => randomBytes(32).toString('base64url')

export const sessionCookieName = SESSION_COOKIE
export const csrfCookieName = CSRF_COOKIE

export const createAnonymousSession = async (payload: Payload) => {
  const sessionToken = token()
  const csrfToken = token()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()

  const session = await payload.create({
    collection: 'anonymous-sessions',
    data: {
      tokenHash: hashToken(sessionToken),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt,
      lastSeenAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  return { csrfToken, expiresAt, session, sessionToken }
}

export const getAnonymousSession = async ({
  payload,
  sessionToken,
}: {
  payload: Payload
  sessionToken: string | undefined
}) => {
  if (!sessionToken) {
    return null
  }

  const sessions = await payload.find({
    collection: 'anonymous-sessions',
    where: { tokenHash: { equals: hashToken(sessionToken) } },
    limit: 1,
    overrideAccess: true,
  })
  const session = sessions.docs[0]

  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return null
  }

  return session
}

export const isValidCsrfToken = ({
  expectedHash,
  token: candidate,
}: {
  expectedHash: string
  token: string | undefined
}): boolean => {
  if (!candidate) {
    return false
  }

  const expected = Buffer.from(expectedHash)
  const received = Buffer.from(hashToken(candidate))

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}
