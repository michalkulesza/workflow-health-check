'use client'

import { useRef, useState } from 'react'

import { AssessmentAdapterError } from '@/lib/assessment/adapter'
import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'
import { emailSchema } from '@/lib/assessment/contracts'

interface ContactStepProps {
  submissionId: string
  onBack: () => void
  onComplete: () => void
}

export const ContactStep = ({
  submissionId,
  onBack,
  onComplete,
}: ContactStepProps) => {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const idempotencyKey = useRef(crypto.randomUUID())

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!emailSchema.safeParse(email).success) {
      setError('Enter a valid email address before sending your request.')

      return
    }

    setIsSending(true)

    try {
      await browserAssessmentAdapter.submitContact({
        submissionId,
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        message: message.trim() || null,
        idempotencyKey: idempotencyKey.current,
      })

      setIsComplete(true)
    } catch (reason) {
      if (
        reason instanceof AssessmentAdapterError &&
        reason.response.error.code === 'idempotency_mismatch'
      ) {
        setError(
          'A different help request is already saved for this assessment. Return to the results to review it.'
        )
      } else {
        setError(
          'We couldn’t save your request. Your details are still here—please try again.'
        )
      }
    } finally {
      setIsSending(false)
    }
  }

  if (isComplete) {
    return (
      <main className="assessment-shell assessment-center" data-theme="light">
        <p className="assessment-eyebrow">Request sent</p>
        <h1>Your request has been sent</h1>
        <p>We’ve saved your details with this workflow assessment.</p>
        <button
          className="assessment-button"
          type="button"
          onClick={onComplete}
        >
          Back to results
        </button>
      </main>
    )
  }

  return (
    <main className="assessment-shell contact-step" data-theme="light">
      <button className="text-button back-link" type="button" onClick={onBack}>
        ← Back to results
      </button>
      <p className="eyebrow">Optional next step</p>
      <h1>Tell us where you’d like help</h1>
      <p className="lede">
        Share a little context and your request will stay connected to this
        workflow assessment.
      </p>
      <form className="contact-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>
            Email <span>Required</span>
            <input
              aria-describedby={error ? 'contact-form-error' : undefined}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Name <span>Optional</span>
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <label>
          What would you like help with? <span>Optional</span>
          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        {error && (
          <p className="error" id="contact-form-error" role="alert">
            {error}
          </p>
        )}
        <button disabled={isSending}>
          {isSending ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </main>
  )
}
