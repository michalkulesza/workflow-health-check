import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const REPORT_GRANT_LIFETIME_MS = 1000 * 60 * 60 * 24 * 7
const REPORT_SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24

const hashSecret = (value: string): string =>
  createHash('sha256')
    .update(`${process.env.REPORT_TOKEN_PEPPER ?? ''}:${value}`)
    .digest('hex')

export const createReportGrantSecrets = (
  deliveryID: number
): {
  expiresAt: Date
  sessionExpiresAt: Date
  sessionToken: string
  sessionTokenHash: string
  token: string
  tokenHash: string
} => {
  const token = createHmac('sha256', process.env.REPORT_TOKEN_PEPPER ?? '')
    .update(`report-delivery:${deliveryID}`)
    .digest('base64url')
  // The link token is exchanged exactly once. It then becomes a scoped,
  // short-lived cookie credential; no second raw secret needs storing.
  const sessionToken = token

  return {
    token,
    tokenHash: hashSecret(token),
    sessionToken,
    sessionTokenHash: hashSecret(sessionToken),
    expiresAt: new Date(Date.now() + REPORT_GRANT_LIFETIME_MS),
    sessionExpiresAt: new Date(Date.now() + REPORT_SESSION_LIFETIME_MS),
  }
}

export const hashReportGrantSecret = (value: string): string =>
  hashSecret(value)

export const reportGrantSecretsMatch = (
  expectedHash: string,
  candidate: string
): boolean => {
  const expected = Buffer.from(expectedHash)
  const received = Buffer.from(hashSecret(candidate))

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}
