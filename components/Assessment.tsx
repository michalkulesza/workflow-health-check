'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import type {
  AnswerValue,
  Questionnaire,
  Report,
  Submission,
} from '@/lib/assessment/contracts'
import { AssessmentAdapterError } from '@/lib/assessment/adapter'
import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'
import {
  MINIMUM_ASSESSMENT_LOADING_DURATION_MS,
  MINIMUM_RESULTS_PROCESSING_DURATION_MS,
  waitForMinimumDuration,
} from '@/lib/assessment/timing'
import { QuestionField } from './QuestionField'
import { ResultsView } from './ResultsView'

type Screen =
  'question' | 'resume' | 'review' | 'processing' | 'clarification' | 'results'
const adapter = browserAssessmentAdapter
const emptyAnswer = (): AnswerValue => ({
  state: 'skipped',
  selectedOptionKeys: [],
  text: null,
  optionText: {},
})
const validate = (q: Questionnaire['questions'][number], a: AnswerValue) => {
  if (!q.required && a.state === 'skipped') return ''
  if (a.state !== 'answered') return 'Please add an answer before continuing.'
  if (q.type === 'text' && !a.text?.trim())
    return 'Please add an answer before continuing.'
  if (q.type !== 'text' && !a.selectedOptionKeys.length)
    return 'Choose an answer before continuing.'
  return a.selectedOptionKeys.some(
    (key) =>
      q.options.find((o) => o.key === key)?.requiresText &&
      !a.optionText[key]?.trim()
  )
    ? 'Please add details for the selected option.'
    : ''
}
const summary = (q: Questionnaire['questions'][number], a?: AnswerValue) => {
  if (!a || a.state === 'skipped') return 'Skipped'
  if (q.type === 'text') return a.text?.trim() || 'Skipped'
  return (
    a.selectedOptionKeys
      .flatMap((key) => {
        const option = q.options.find((item) => item.key === key)
        if (!option) return []
        const detail = a.optionText[key]?.trim()
        return detail ? `${option.label}: ${detail}` : option.label
      })
      .join(', ') || 'Skipped'
  )
}

export const Assessment = ({
  questionnaireId,
}: {
  questionnaireId: string
}) => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [screen, setScreen] = useState<Screen>('question')
  const [drafts, setDrafts] = useState<Record<string, AnswerValue>>({})
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [clarification, setClarification] = useState('')
  const [returnToReview, setReturnToReview] = useState(false)
  const [pollingError, setPollingError] = useState('')
  const [pollingRetry, setPollingRetry] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const polling = useRef(false)
  const initialisationRequest = useRef(0)
  const processingStartedAt = useRef<number | null>(null)
  const initialise = async () => {
    const requestId = ++initialisationRequest.current
    const loadingStartedAt = Date.now()
    setError('')
    try {
      await adapter.createSession()
      const [content, resumed] = await Promise.all([
        adapter.getQuestionnaire(questionnaireId),
        adapter.getResume(questionnaireId),
      ])
      await waitForMinimumDuration(
        loadingStartedAt,
        MINIMUM_ASSESSMENT_LOADING_DURATION_MS
      )
      if (requestId !== initialisationRequest.current) {
        return
      }

      setQuestionnaire(content)
      if (resumed) {
        setSubmission(resumed)
        const nextScreen =
          resumed.state === 'in_progress'
            ? Object.keys(resumed.answers).length
              ? 'resume'
              : 'question'
            : resumed.state === 'awaiting_clarification'
              ? 'clarification'
              : 'processing'
        if (nextScreen === 'processing') {
          processingStartedAt.current = Date.now()
        }
        setScreen(nextScreen)
      } else {
        const createdSubmission = await adapter.createSubmission({
          questionnaireId,
          displayedVersionId: content.versionId,
        })
        if (requestId !== initialisationRequest.current) {
          return
        }
        setSubmission(createdSubmission)
      }
    } catch {
      if (requestId === initialisationRequest.current) {
        setError(
          'We could not load this assessment. Check your connection and try again.'
        )
      }
    }
  }
  useEffect(() => {
    void initialise()
    return () => {
      initialisationRequest.current += 1
    }
  }, [questionnaireId])
  useEffect(() => {
    heading.current?.focus()
  }, [screen, submission?.currentStep])
  useEffect(() => {
    if (
      !submission ||
      !['submitted', 'processing', 'ready', 'partial', 'failed'].includes(
        submission.state
      )
    )
      return
    let active = true
    const refresh = async () => {
      if (polling.current) return
      polling.current = true
      try {
        const next = await adapter.getReport(submission.submissionId)
        if (!active) return
        setPollingError('')
        if (next.status === 'pending') {
          const current = await adapter.getSubmission(submission.submissionId)
          if (active && current.state === 'awaiting_clarification') {
            setSubmission(current)
            setScreen('clarification')
            return
          }
        }
        if (!active) return
        setReport(next)
        const startedAt = processingStartedAt.current ?? Date.now()
        await waitForMinimumDuration(
          startedAt,
          MINIMUM_RESULTS_PROCESSING_DURATION_MS
        )
        if (!active) return
        setScreen('results')
      } catch {
        if (active) {
          setPollingError(
            'Results are temporarily unavailable. Your assessment is saved; please try again.'
          )
        }
      } finally {
        polling.current = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 3000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [pollingRetry, submission])
  if (error && !questionnaire)
    return (
      <main className="assessment-shell assessment-center" data-theme="light">
        <h1>Assessment unavailable</h1>
        <p className="assessment-error">{error}</p>
        <button className="assessment-button" onClick={() => void initialise()}>
          Retry
        </button>
        <Link href="/" className="assessment-link">
          Back to site
        </Link>
      </main>
    )
  if (!questionnaire || !submission)
    return (
      <main
        className="assessment-shell assessment-center assessment-state-enter"
        data-theme="light"
        aria-live="polite"
      >
        <p className="assessment-wordmark">WORKFLOW CHECK</p>
        <h1>Preparing your assessment</h1>
        <p>Loading your questions…</p>
      </main>
    )
  const q = questionnaire.questions[submission.currentStep]
  const category = questionnaire.categories.find(
    (item) => item.key === q?.categoryKey
  )
  const answer = q
    ? (drafts[q.key] ?? submission.answers[q.key] ?? emptyAnswer())
    : emptyAnswer()
  const save = async (nextStep: number) => {
    if (!q) return false
    const message = validate(q, answer)
    if (message) {
      setError(message)
      return false
    }
    setSaveState('saving')
    setError('')
    try {
      const result = await adapter.saveAnswer({
        submissionId: submission.submissionId,
        questionKey: q.key,
        expectedRevision: submission.revision,
        mutationId: crypto.randomUUID(),
        answer,
      })
      const saved = await adapter.saveProgress({
        submissionId: submission.submissionId,
        currentStep: nextStep,
        expectedRevision: result.revision,
      })
      setSubmission(saved)
      setDrafts((all) => {
        const next = { ...all }
        delete next[q.key]
        return next
      })
      setSaveState('saved')
      return true
    } catch (reason) {
      if (
        reason instanceof AssessmentAdapterError &&
        reason.response.error.code === 'stale_revision'
      ) {
        const latest = await adapter.getSubmission(submission.submissionId)
        setSubmission(latest)
        setDrafts((all) => ({
          ...all,
          [q.key]: latest.answers[q.key] ?? answer,
        }))
        setError(
          'This assessment changed in another tab. Your latest saved answer has been restored.'
        )
      } else
        setError(
          'We couldn’t save your answer. Your input is still here—please retry.'
        )
      setSaveState('error')
      return false
    }
  }
  const next = async () => {
    const last = submission.currentStep === questionnaire.questions.length - 1
    if (
      await save(last ? submission.currentStep : submission.currentStep + 1)
    ) {
      if (returnToReview) {
        setReturnToReview(false)
        setScreen('review')
      } else if (last) setScreen('review')
    }
  }
  const submit = async () => {
    setSaveState('saving')
    setError('')
    try {
      const result = await adapter.submitSubmission({
        submissionId: submission.submissionId,
        expectedRevision: submission.revision,
        mutationId: crypto.randomUUID(),
      })
      setSubmission({
        ...submission,
        revision: result.revision,
        state: 'submitted',
      })
      processingStartedAt.current = Date.now()
      setScreen('processing')
    } catch {
      setSaveState('error')
      setError(
        'We couldn’t submit your assessment. Your answers are still saved—please retry.'
      )
    }
  }
  if (screen === 'resume')
    return (
      <main className="assessment-shell assessment-center" data-theme="light">
        <p className="assessment-wordmark">WORKFLOW CHECK</p>
        <p className="assessment-eyebrow">Welcome back</p>
        <h1 ref={heading} tabIndex={-1}>
          Continue your assessment
        </h1>
        <p>
          You have saved answers in {category?.label ?? 'this assessment'}.
          Continue where you left off.
        </p>
        <button
          className="assessment-button"
          onClick={() => setScreen('question')}
        >
          Continue
        </button>
        <Link href="/" className="assessment-link">
          Back to site
        </Link>
      </main>
    )
  if (screen === 'processing')
    return (
      <main
        className="assessment-shell assessment-center assessment-state-enter"
        data-theme="light"
        aria-live="polite"
      >
        <span className="assessment-loader" aria-hidden="true" />
        <p className="assessment-eyebrow">Reviewing your answers</p>
        <h1>Generating your workflow results</h1>
        <p>
          We’re preparing your results. You can keep this page open while we
          finish.
        </p>
        {pollingError && (
          <>
            <p className="assessment-error">{pollingError}</p>
            <button
              className="assessment-button"
              onClick={() => setPollingRetry((value) => value + 1)}
            >
              Retry now
            </button>
          </>
        )}
      </main>
    )
  if (screen === 'clarification' && submission.clarification)
    return (
      <main className="assessment-shell" data-theme="light">
        <p className="assessment-wordmark">WORKFLOW CHECK</p>
        <p className="assessment-eyebrow">One extra question</p>
        <h1 ref={heading} tabIndex={-1}>
          {submission.clarification.prompt}
        </h1>
        <label htmlFor="clarification-response">Your response</label>
        <textarea
          id="clarification-response"
          value={clarification}
          onChange={(e) => setClarification(e.target.value)}
        />
        {error && <p className="assessment-error">{error}</p>}
        <div className="assessment-actions">
          <span />
          <button
            className="assessment-button"
            disabled={saveState === 'saving'}
            onClick={async () => {
              if (!clarification.trim()) {
                setError('Please add a specific example before continuing.')
                return
              }
              setSaveState('saving')
              try {
                await adapter.submitClarification({
                  submissionId: submission.submissionId,
                  evaluationKey: submission.clarification!.evaluationKey,
                  response: clarification,
                })
                setSubmission({
                  ...submission,
                  state: 'processing',
                  clarification: null,
                })
                processingStartedAt.current = Date.now()
                setScreen('processing')
              } catch {
                setSaveState('error')
                setError(
                  'We couldn’t save that response. Your input is still here—please retry.'
                )
              }
            }}
          >
            {saveState === 'saving' ? 'Saving…' : 'Continue analysis'} →
          </button>
        </div>
      </main>
    )
  if (screen === 'results' && report)
    return (
      <ResultsView report={report} submissionId={submission.submissionId} />
    )
  if (screen === 'review')
    return (
      <main className="assessment-shell assessment-review" data-theme="light">
        <p className="assessment-wordmark">WORKFLOW CHECK</p>
        <p className="assessment-eyebrow">Ready to review</p>
        <h1 ref={heading} tabIndex={-1}>
          Your answers
        </h1>
        <p>Check anything you want to change before submitting.</p>
        {questionnaire.categories.map((group) => (
          <section className="assessment-review-group" key={group.key}>
            <h2>{group.label}</h2>
            {questionnaire.questions
              .filter((item) => item.categoryKey === group.key)
              .map((item) => (
                <article key={item.key}>
                  <div>
                    <p className="assessment-meta">Question {item.number}</p>
                    <h3>{item.prompt}</h3>
                    <p>{summary(item, submission.answers[item.key])}</p>
                  </div>
                  <button
                    className="assessment-text-button"
                    aria-label={`Edit question ${item.number}: ${item.prompt}`}
                    onClick={() => {
                      setSubmission({
                        ...submission,
                        currentStep: item.number - 1,
                      })
                      setReturnToReview(true)
                      setScreen('question')
                    }}
                  >
                    Edit
                  </button>
                </article>
              ))}
          </section>
        ))}
        {error && <p className="assessment-error">{error}</p>}
        <div className="assessment-submit">
          <div>
            <strong>Ready for your workflow check?</strong>
            <span>Your results do not require an email.</span>
          </div>
          <button
            className="assessment-button"
            disabled={saveState === 'saving'}
            onClick={() => void submit()}
          >
            See my results →
          </button>
        </div>
      </main>
    )
  if (!q)
    return (
      <main className="assessment-shell assessment-center" data-theme="light">
        <h1>Assessment complete</h1>
      </main>
    )
  return (
    <main className="assessment-shell" data-theme="light">
      <header className="assessment-header">
        <span className="assessment-wordmark">WORKFLOW CHECK</span>
        <span className="assessment-meta">
          Question {q.number} of {questionnaire.questions.length}
        </span>
      </header>
      <div
        className="assessment-progress"
        role="progressbar"
        aria-label={`Question ${q.number} of ${questionnaire.questions.length}`}
        aria-valuenow={q.number}
        aria-valuemin={1}
        aria-valuemax={questionnaire.questions.length}
      >
        <span
          style={{
            width: `${(q.number / questionnaire.questions.length) * 100}%`,
          }}
        />
      </div>
      <p className="assessment-eyebrow">{category?.label}</p>
      <h1 ref={heading} tabIndex={-1}>
        {q.prompt}
      </h1>
      <p className="assessment-help">
        {q.instructions ??
          (q.required
            ? 'Required question'
            : 'Optional — you may skip this question.')}
      </p>
      <QuestionField
        question={q}
        value={answer}
        onChange={(value) => {
          setDrafts((all) => ({ ...all, [q.key]: value }))
          setError('')
          setSaveState('idle')
        }}
        error={error}
      />
      <div className="assessment-actions">
        {submission.currentStep > 0 ? (
          <button
            className="assessment-button assessment-secondary"
            onClick={() => {
              setSubmission({
                ...submission,
                currentStep: submission.currentStep - 1,
              })
              setError('')
            }}
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div className={`assessment-save ${saveState}`} aria-live="polite">
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'error'
                ? 'Couldn’t save. Retry.'
                : ''}
        </div>
        <button
          className="assessment-button"
          disabled={saveState === 'saving'}
          onClick={() => void next()}
        >
          {returnToReview
            ? 'Save and return to review'
            : q.number === questionnaire.questions.length
              ? 'Review answers'
              : 'Next'}{' '}
          →
        </button>
      </div>
      {returnToReview && (
        <button
          className="assessment-text-button"
          onClick={() => {
            setReturnToReview(false)
            setScreen('review')
          }}
        >
          Cancel edit
        </button>
      )}
    </main>
  )
}
