import { afterEach, describe, expect, it, vi } from 'vitest'

import { createResendClient, ResendDeliveryError } from './resend'

const EMAIL = {
  from: 'Reports <reports@example.test>',
  html: '<p>Ready</p>',
  idempotencyKey: 'report-ready:1:2',
  subject: 'Ready',
  to: 'person@example.test',
}
const originalFetch = global.fetch
const originalApiKey = process.env.RESEND_API_KEY
const originalEmailFrom = process.env.EMAIL_FROM

afterEach(() => {
  global.fetch = originalFetch
  process.env.RESEND_API_KEY = originalApiKey
  process.env.EMAIL_FROM = originalEmailFrom
})

describe('Resend client', () => {
  it('uses a stable provider idempotency key', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.EMAIL_FROM = EMAIL.from

    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'email_123' }), { status: 200 })
      )
    global.fetch = fetcher

    await expect(createResendClient().send(EMAIL)).resolves.toEqual({
      id: 'email_123',
    })

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': EMAIL.idempotencyKey,
        }),
      })
    )
  })

  it('marks transport ambiguity as retryable and invalid recipients as terminal', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.EMAIL_FROM = EMAIL.from
    global.fetch = vi.fn().mockRejectedValue(new Error('network'))

    await expect(createResendClient().send(EMAIL)).rejects.toMatchObject({
      retryable: true,
    } satisfies Partial<ResendDeliveryError>)

    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 422 }))

    await expect(createResendClient().send(EMAIL)).rejects.toMatchObject({
      retryable: false,
    } satisfies Partial<ResendDeliveryError>)
  })
})
