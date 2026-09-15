'use client'

import { useState } from 'react'

import type { Report } from '@/lib/assessment/contracts'
import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'

import { ContactStep } from './ContactStep'

const adapter = browserAssessmentAdapter

export const ResultsView = ({
  report,
  submissionId,
}: {
  report: Report
  submissionId?: string
}) => {
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [isSending, setIsSending] = useState(false)

  if (isContactOpen && submissionId) {
    return (
      <ContactStep
        submissionId={submissionId}
        onBack={() => setIsContactOpen(false)}
        onComplete={() => setIsContactOpen(false)}
      />
    )
  }

  const requestNotification = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!submissionId) {
      return
    }

    setIsSending(true)
    setNotice('')

    try {
      await adapter.requestNotification({
        submissionId,
        email,
        purpose: 'report_ready',
      })

      setNotice(
        'We’ll email this private report link when the remaining analysis is ready.'
      )
    } catch {
      setNotice('We couldn’t save that request. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="results" data-theme="light">
      <p className="eyebrow">Your workflow check</p>
      <h1>
        {report.status === 'pending'
          ? 'Generating your workflow results'
          : report.priorities.length
            ? report.summary
            : report.status === 'complete'
              ? 'No major issues identified'
              : report.summary}
      </h1>
      {report.priorities.map((priority, index) => (
        <article className="priority" key={priority.categoryKey}>
          <div className="priority-top">
            <div>
              <span className="badge">Needs attention</span>
              <p className="eyebrow">Priority {index + 1}</p>
              <h2>{priority.categoryLabel}</h2>
            </div>
            <div className="score">
              <strong>
                {Number.isInteger(priority.score)
                  ? priority.score
                  : priority.score.toFixed(1)}
              </strong>
              <span>/ {priority.maxPoints}</span>
            </div>
          </div>
          <p>{priority.explanation}</p>
          <div className="first-step">
            <span>FIRST STEP</span>
            <p>{priority.firstStep}</p>
          </div>
        </article>
      ))}
      {report.status === 'pending' && submissionId && (
        <aside className="notice">
          <div role="status" aria-live="polite">
            <div className="loader" aria-hidden="true" />
            <strong>
              Your answers are saved. We’re preparing your report.
            </strong>
            <p>
              Your results will appear here automatically when ready. You can
              keep this page open or get an email notification below.
            </p>
          </div>
          <form onSubmit={requestNotification} noValidate>
            <label htmlFor="notify-email">
              Email for the report notification
            </label>
            <div className="inline-form">
              <input
                id="notify-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button className="assessment-button" disabled={isSending}>
                {isSending ? 'Saving…' : 'Notify me when ready'}
              </button>
            </div>
          </form>
          {notice && (
            <p className={notice.startsWith('We couldn') ? 'error' : 'success'}>
              {notice}
            </p>
          )}
        </aside>
      )}
      {report.status === 'insufficient' && (
        <aside className="notice">
          <strong>Some evidence is still unclear</strong>
          <p>{report.summary}</p>
        </aside>
      )}
      {submissionId && (
        <section className="cta">
          <p className="eyebrow">Want a second pair of eyes?</p>
          <h2>Get help with your next step</h2>
          <p>
            If you’d like support turning these findings into a practical
            change, send a note. This is optional.
          </p>
          <button
            className="assessment-button"
            onClick={() => setIsContactOpen(true)}
          >
            Request help
          </button>
        </section>
      )}
    </main>
  )
}
