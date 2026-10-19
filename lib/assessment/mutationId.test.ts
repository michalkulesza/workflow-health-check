import { describe, expect, it } from 'vitest'

import { mutationIdSchema } from './contracts'
import { createMutationId } from './mutationId'

describe('createMutationId', () => {
  it('uses randomUUID when the browser provides it', () => {
    const mutationId = 'a82fd5b4-c92f-4d3c-a3a1-97ff8b7f2c52'

    expect(
      createMutationId({
        randomUUID: () => mutationId,
        getRandomValues: () => new Uint8Array(),
      })
    ).toBe(mutationId)
  })

  it('creates a valid UUID when randomUUID is unavailable', () => {
    const mutationId = createMutationId({
      getRandomValues: <T extends ArrayBufferView>(values: T): T => {
        if (values instanceof Uint8Array) {
          values.fill(0)
        }

        return values
      },
    })

    expect(mutationId).toBe('00000000-0000-4000-8000-000000000000')
    expect(mutationIdSchema.safeParse(mutationId).success).toBe(true)
  })
})
