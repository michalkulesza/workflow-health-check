'use client'

import { useState } from 'react'

import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'

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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSending(true)

    try {
      await browserAssessmentAdapter.submitContact({
        submissionId,
        email,
        name: name.trim() || null,
        message: message.trim() || null,
        idempotencyKey: crypto.randomUUID(),
      })

      onComplete()
    } catch {
      setError(
        'We couldn’t save your request. Your details are still here—please try again.'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="contact-step narrow">
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
        {error && <p className="error">{error}</p>}
        <button disabled={isSending}>
          {isSending ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </main>
  )
}
