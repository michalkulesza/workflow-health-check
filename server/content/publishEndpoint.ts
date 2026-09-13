import { z } from 'zod'
import type { PayloadRequest } from 'payload'

import {
  PublicationConflictError,
  publishQuestionnaire,
} from './publishQuestionnaire'

const requestSchema = z
  .object({ draftVersionId: z.coerce.number().int().positive() })
  .strict()
const questionnaireIDSchema = z.coerce.number().int().positive()

export const publishEndpoint = async (req: PayloadRequest) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedPath = questionnaireIDSchema.safeParse(req.routeParams?.id)
  const body = req.json ? await req.json() : null
  const parsedBody = requestSchema.safeParse(body)

  if (!parsedPath.success || !parsedBody.success) {
    return Response.json(
      { error: 'Invalid publication request' },
      { status: 400 }
    )
  }

  try {
    const result = await publishQuestionnaire({
      payload: req.payload,
      questionnaireID: parsedPath.data,
      draftVersionID: parsedBody.data.draftVersionId,
    })

    return Response.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof PublicationConflictError) {
      return Response.json({ error: error.message }, { status: 409 })
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Draft validation failed' },
        { status: 422 }
      )
    }

    throw error
  }
}
