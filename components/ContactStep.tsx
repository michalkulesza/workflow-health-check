'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { QUESTIONNAIRE_ID } from '@/lib/fixtures'
import { createMockServices } from '@/lib/mock-services'
import type { Scenario } from '@/lib/types'

interface ContactFormValues {
  email: string
  name: string
  message: string
}

interface ContactStepProps {
  scenario: Scenario
  onBack: () => void
  onComplete: () => void
}

export const ContactStep = ({
  scenario,
  onBack,
  onComplete,
}: ContactStepProps) => {
  const [services] = useState(() => createMockServices(QUESTIONNAIRE_ID))
  const [submissionError, setSubmissionError] = useState('')
  const form = useForm<ContactFormValues>()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    const shouldFail = scenario === 'contact-error' && !submissionError
    setSubmissionError('')

    try {
      await services.submitContact(values, shouldFail)
      onComplete()
    } catch {
      setSubmissionError(
        'We couldn’t save your request. Your details are still here—please try again.'
      )
    }
  })

  return (
    <main className="contact-step narrow">
      <button className="text-button back-link" type="button" onClick={onBack}>
        ← Back to results
      </button>
      <p className="eyebrow">Optional next step</p>
      <h1 ref={heading} tabIndex={-1}>
        Tell us where you’d like help
      </h1>
      <p className="lede">
        Share a little context and your request will stay connected to this
        workflow assessment.
      </p>
      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label>
            Email <span>Required</span>
            <input
              type="email"
              autoComplete="email"
              {...form.register('email', {
                required: 'Enter your email address.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address.',
                },
              })}
            />
            {form.formState.errors.email && (
              <small className="error">
                {form.formState.errors.email.message}
              </small>
            )}
          </label>
          <label>
            Name <span>Optional</span>
            <input autoComplete="name" {...form.register('name')} />
          </label>
        </div>
        <label>
          What would you like help with? <span>Optional</span>
          <textarea rows={5} {...form.register('message')} />
        </label>
        {submissionError && <p className="error">{submissionError}</p>}
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </main>
  )
}
