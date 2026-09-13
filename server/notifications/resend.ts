export type ResendEmail = {
  from: string
  html: string
  idempotencyKey: string
  subject: string
  to: string
}

export type ResendSendResult = { id: string }

export class ResendDeliveryError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = 'ResendDeliveryError'
    this.retryable = retryable
  }
}

export type ResendClient = {
  send(email: ResendEmail): Promise<ResendSendResult>
}

export const createResendClient = (): ResendClient => ({
  async send(email) {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey || !process.env.EMAIL_FROM) {
      throw new ResendDeliveryError(
        'Resend email configuration is missing',
        false
      )
    }

    let response: Response

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': email.idempotencyKey,
        },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
        }),
      })
    } catch {
      throw new ResendDeliveryError(
        'Resend request could not be completed',
        true
      )
    }

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new ResendDeliveryError(
        `Resend rejected the delivery (${response.status})`,
        response.status === 429 || response.status >= 500
      )
    }

    if (
      !body ||
      typeof body !== 'object' ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new ResendDeliveryError('Resend returned an invalid response', true)
    }

    return { id: body.id }
  },
})
