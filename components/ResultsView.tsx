'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ReportResult, Scenario } from '@/lib/types'
import { createMockServices } from '@/lib/mock-services'
import { QUESTIONNAIRE_ID } from '@/lib/fixtures'

export const ResultsView = ({
  result,
  scenario = 'happy',
  reportLink = false,
}: {
  result: ReportResult
  scenario?: Scenario
  reportLink?: boolean
}) => {
  const services = createMockServices(QUESTIONNAIRE_ID)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactDone, setContactDone] = useState(false)
  const [contactError, setContactError] = useState('')

  const [notifyState, setNotifyState] = useState<'idle' | 'done' | 'error'>(
    'idle'
  )
  const contact = useForm<{ email: string; name: string; message: string }>()
  const notify = useForm<{ email: string }>()

  const submitContact = contact.handleSubmit(async (data) => {
    const shouldFail = scenario === 'contact-error' && !contactError
    setContactError('')

    try {
      await services.submitContact(data, shouldFail)
      setContactDone(true)
    } catch {
      setContactError(
        'We couldn’t save your request. Your details are still here—please try again.'
      )
    }
  })

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
        {!contactOpen && !contactDone && (
          <button onClick={() => setContactOpen(true)}>Request help</button>
        )}
        {contactDone ? (
          <div className="confirmation" role="status">
            <strong>Thanks—your request has been recorded.</strong>
            <p>You can close this page or keep a copy of your results.</p>
          </div>
        ) : (
          contactOpen && (
            <form onSubmit={submitContact} noValidate>
              <div className="form-grid">
                <label>
                  Email <span>Required</span>
                  <input
                    type="email"
                    {...contact.register('email', {
                      required: 'Enter your email address.',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address.',
                      },
                    })}
                  />
                  {contact.formState.errors.email && (
                    <small className="error">
                      {contact.formState.errors.email.message}
                    </small>
                  )}
                </label>
                <label>
                  Name <span>Optional</span>
                  <input {...contact.register('name')} />
                </label>
              </div>
              <label>
                What would you like help with? <span>Optional</span>
                <textarea rows={4} {...contact.register('message')} />
              </label>
              {contactError && <p className="error">{contactError}</p>}
              <button disabled={contact.formState.isSubmitting}>
                {contact.formState.isSubmitting ? 'Sending…' : 'Send request'}
              </button>
            </form>
          )
        )}
      </section>
    </main>
  )
}
