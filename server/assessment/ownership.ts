import type { Payload } from 'payload'

import { isAllowedAssessmentOrigin } from './origin'
import { getAnonymousSession, isValidCsrfToken } from './session'

const cookieValue = (request: Request, name: string): string | undefined =>
  request.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1]

export const getRequestSession = async (payload: Payload, request: Request) =>
  getAnonymousSession({
    payload,
    sessionToken: cookieValue(request, 'assessment_session'),
  })

export const isAuthorizedWrite = ({
  request,
  csrfTokenHash,
}: {
  request: Request
  csrfTokenHash: string
}): boolean =>
  isAllowedAssessmentOrigin(request) &&
  isValidCsrfToken({
    expectedHash: csrfTokenHash,
    token: request.headers.get('x-assessment-csrf') ?? undefined,
  })

export const getOwnedSubmission = async ({
  externalID,
  payload,
  sessionID,
}: {
  externalID: string
  payload: Payload
  sessionID: number
}) => {
  const result = await payload.find({
    collection: 'submissions',
    where: {
      and: [
        { externalId: { equals: externalID } },
        { session: { equals: sessionID } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.docs[0] ?? null
}
