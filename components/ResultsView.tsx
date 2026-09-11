'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { QUESTIONNAIRE_ID } from '@/lib/fixtures'
import { createMockServices } from '@/lib/mock-services'
import type { ReportResult, Scenario } from '@/lib/types'

import { ContactStep } from './ContactStep'

type ResultsStep = 'results' | 'contact' | 'confirmation'

export const ResultsView = ({
  result,
  scenario = 'happy',
  reportLink = false,
}: {
  result: ReportResult
  scenario?: Scenario
  reportLink?: boolean
}) => {
  const [services] = useState(() => createMockServices(QUESTIONNAIRE_ID))
  const [step, setStep] = useState<ResultsStep>('results')

  const [notifyState, setNotifyState] = useState<'idle' | 'done' | 'error'>(
    'idle'
  )
  const notify = useForm<{ email: string }>()
  const confirmationHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (step === 'confirmation') {
      confirmationHeading.current?.focus()
    }
  }, [step])

  const submitNotify = notify.handleSubmit(async (data) => {
    const shouldFail =
      scenario === 'notification-error' && notifyState !== 'error'
    setNotifyState('idle')

    try {
      await services.requestNotification(data.email, shouldFail)
      setNotifyState('done')
    } catch {
      setNotifyState('error')
    }
  })

  if (step === 'contact') {
    return (
      <ContactStep
        scenario={scenario}
        onBack={() => setStep('results')}
        onComplete={() => setStep('confirmation')}
      />
    )
  }

  if (step === 'confirmation') {
    return (
      <main className="confirmation-step narrow center" role="status">
        <p className="eyebrow">Request received</p>
        <h1 ref={confirmationHeading} tabIndex={-1}>
          Thanks—your request has been recorded.
        </h1>
        <p className="lede">
          You can close this page or return to your workflow results.
        </p>
        <button onClick={() => setStep('results')}>Return to results</button>
      </main>
    )
  }

  return (
    <main className="results narrow">
      <p className="eyebrow">
        {reportLink ? 'Your saved report' : 'Your workflow check'}
      </p>
      <h1>
        {result.kind === 'pending'
          ? 'Part of your report is still processing'
          : result.priorities.length
            ? result.summary
            : 'No major issues identified'}
      </h1>
      <p className="lede">
        {result.priorities.length
          ? 'These are the clearest places to focus based on the answers available.'
          : result.summary}
      </p>
      {result.priorities.map((p, i) => (
        <article className="priority" key={p.categoryId}>
          <div className="priority-top">
            <div>
              <span className="badge">Needs attention</span>
              <p className="eyebrow">Priority {i + 1}</p>
              <h2>{p.categoryName}</h2>
            </div>
            <div className="score">
              <strong>
                {Number.isInteger(p.score) ? p.score : p.score.toFixed(1)}
              </strong>
              <span>/ {p.maxPoints}</span>
            </div>
          </div>
          <p>{p.explanation}</p>
          <div className="first-step">
            <span>FIRST STEP</span>
            <p>{p.firstStep}</p>
          </div>
        </article>
      ))}
      {result.kind === 'insufficient' && (
        <aside className="notice">
          <strong>Some evidence is still unclear</strong>
          <p>{result.summary}</p>
        </aside>
      )}
      {result.kind === 'pending' && (
        <aside className="notice">
          <strong>Reflection-based analysis pending</strong>
          <p>{result.summary}</p>
          <p>This does not mean the missing area is healthy or unhealthy.</p>
          {notifyState === 'done' ? (
            <p className="success">
              You’re on the prototype notification list. No real email was sent.
            </p>
          ) : (
            <form onSubmit={submitNotify} noValidate>
              <label htmlFor="notify-email">
                Email for the report notification
              </label>
              <div className="inline-form">
                <input
                  id="notify-email"
                  type="email"
                  {...notify.register('email', {
                    required: 'Enter an email address.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address.',
                    },
                  })}
                />
                <button disabled={notify.formState.isSubmitting}>
                  {notify.formState.isSubmitting
                    ? 'Saving…'
                    : 'Notify me when ready'}
                </button>
              </div>
              {notify.formState.errors.email && (
                <p className="error">{notify.formState.errors.email.message}</p>
              )}
              {notifyState === 'error' && (
                <p className="error">
                  We couldn’t save that request. Please try again.
                </p>
              )}
              <small>
                This address is only for this report notification. It does not
                create a request for help.
              </small>
            </form>
          )}
        </aside>
      )}
      <section className="cta">
        <p className="eyebrow">Want a second pair of eyes?</p>
        <h2>Get help with your next step</h2>
        <p>
          If you’d like support turning these findings into a practical change,
          send a note. This is optional.
        </p>
        <button onClick={() => setStep('contact')}>Request help</button>
      </section>
    </main>
  )
}
