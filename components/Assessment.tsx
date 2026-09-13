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

import { QuestionField } from './QuestionField'
import { ResultsView } from './ResultsView'

type Screen = 'question' | 'review' | 'processing' | 'clarification' | 'results'

const emptyAnswer = (): AnswerValue => ({
  state: 'skipped',
  selectedOptionKeys: [],
  text: null,
  optionText: {},
})
const adapter = browserAssessmentAdapter

const answerError = (
  question: Questionnaire['questions'][number],
  answer: AnswerValue
): string => {
  if (!question.required) {
    return ''
  }

  if (answer.state !== 'answered') {
    return 'Please add an answer before continuing.'
  }

  if (question.type === 'text' && !answer.text?.trim()) {
    return 'Please add an answer before continuing.'
  }

  if (question.type !== 'text' && answer.selectedOptionKeys.length === 0) {
    return 'Choose an answer before continuing.'
  }

  const missingText = answer.selectedOptionKeys.some(
    (key) =>
      question.options.find((option) => option.key === key)?.requiresText &&
      !answer.optionText[key]?.trim()
  )

  return missingText ? 'Please add details for the selected option.' : ''
}

export const Assessment = ({
  questionnaireId,
}: {
  questionnaireId: string
}) => {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [screen, setScreen] = useState<Screen>('question')
  const [draft, setDraft] = useState<AnswerValue>(emptyAnswer())
  const [error, setError] = useState('')

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [report, setReport] = useState<Report | null>(null)
  const [clarification, setClarification] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  const refreshReport = async (submissionId: string) => {
    const nextReport = await adapter.getReport(submissionId)
    setReport(nextReport)

    setScreen('results')
  }

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const content = await adapter.getQuestionnaire(questionnaireId)
        await adapter.createSession()
        const resumed = await adapter.getResume(questionnaireId)

        if (!active) {
          return
        }

        setQuestionnaire(content)

        if (resumed) {
          setSubmission(resumed)

          setScreen(
            resumed.state === 'awaiting_clarification'
              ? 'clarification'
              : 'question'
          )
        } else {
          setSubmission(
            await adapter.createSubmission({
              questionnaireId,
              displayedVersionId: content.versionId,
            })
          )
        }
      } catch {
        if (active) {
          setError(
            'We could not load this assessment. Please try again shortly.'
          )
        }
      }
    })()

    return () => {
      active = false
    }
  }, [questionnaireId])

  useEffect(() => {
    heading.current?.focus()
  }, [screen, submission?.currentStep])

  useEffect(() => {
    if (
      !submission ||
      !['submitted', 'processing'].includes(submission.state)
    ) {
      return
    }

    const timer = window.setInterval(() => {
      void refreshReport(submission.submissionId).catch(() => undefined)
    }, 3000)
    void refreshReport(submission.submissionId).catch(() => undefined)

    return () => window.clearInterval(timer)
  }, [submission])

  if (error && !questionnaire) {
    return (
      <main className="narrow center">
        <h1>Assessment unavailable</h1>
        <p className="error">{error}</p>
        <Link className="button" href="/">
          Return home
        </Link>
      </main>
    )
  }

  if (!questionnaire || !submission) {
    return (
      <main className="narrow center" aria-live="polite">
        <p>Loading your assessment…</p>
      </main>
    )
  }

  const question = questionnaire.questions[submission.currentStep]

  const category = questionnaire.categories.find(
    (candidate) => candidate.key === question?.categoryKey
  )
  const currentAnswer = submission.answers[question?.key] ?? draft

  const saveCurrent = async (nextStep: number) => {
    if (!question) {
      return false
    }

    const message = answerError(question, currentAnswer)

    if (message) {
      setError(message)

      return false
    }

    setSaveState('saving')
    setError('')

    try {
      const answerResult = await adapter.saveAnswer({
        submissionId: submission.submissionId,
        questionKey: question.key,
        expectedRevision: submission.revision,
        mutationId: crypto.randomUUID(),
        answer: currentAnswer,
      })

      const saved = await adapter.saveProgress({
        submissionId: submission.submissionId,
        currentStep: nextStep,
        expectedRevision: answerResult.revision,
      })
      setSubmission(saved)
      setSaveState('saved')

      return true
    } catch (reason) {
      if (
        reason instanceof AssessmentAdapterError &&
        reason.response.error.code === 'stale_revision'
      ) {
        const latest = await adapter.getSubmission(submission.submissionId)
        setSubmission(latest)
        setDraft(latest.answers[question.key] ?? draft)

        setError(
          'This assessment changed in another tab. Your latest saved answer has been restored.'
        )
      } else {
        setError(
          'We couldn’t save your answer. Your input is still here—please try again.'
        )
      }

      setSaveState('error')

      return false
    }
  }

  const goNext = async () => {
    const isLast = submission.currentStep === questionnaire.questions.length - 1

    if (
      await saveCurrent(
        isLast ? submission.currentStep : submission.currentStep + 1
      )
    ) {
      setDraft(emptyAnswer())

      if (isLast) {
        setScreen('review')
      }
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

      setScreen('processing')
    } catch {
      setSaveState('error')

      setError(
        'We couldn’t submit your assessment. Your answers are still saved—please try again.'
      )
    }
  }

  if (screen === 'processing') {
    return (
      <main className="narrow processing" aria-live="polite">
        <div className="loader" />
        <p className="eyebrow">Reviewing your answers</p>
        <h1 ref={heading} tabIndex={-1}>
          Looking for the clearest priorities…
        </h1>
        <p>
          We’re preparing your results. You can keep this page open while we
          finish.
        </p>
      </main>
    )
  }

  if (screen === 'clarification' && submission.clarification) {
    return (
      <main className="narrow question-page">
        <p className="eyebrow">One extra step</p>
        <h1 ref={heading} tabIndex={-1}>
          {submission.clarification.prompt}
        </h1>
        <textarea
          rows={7}
          value={clarification}
          onChange={(event) => setClarification(event.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <div className="question-actions">
          <button
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

                setScreen('processing')
              } catch {
                setSaveState('error')

                setError(
                  'We couldn’t save that response. Your input is still here—please try again.'
                )
              }
            }}
          >
            Continue analysis
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'results' && report) {
    return (
      <ResultsView report={report} submissionId={submission.submissionId} />
    )
  }

  if (screen === 'review') {
    return (
      <main className="wide review">
        <div className="review-head">
          <div>
            <p className="eyebrow">Ready to review</p>
            <h1 ref={heading} tabIndex={-1}>
              Your answers
            </h1>
            <p>Check anything you want to change before submitting.</p>
          </div>
        </div>
        {questionnaire.categories.map((group) => (
          <section className="review-group" key={group.key}>
            <h2>{group.label}</h2>
            {questionnaire.questions
              .filter((item) => item.categoryKey === group.key)
              .map((item) => (
                <article key={item.key}>
                  <div>
                    <span>Q{item.number}</span>
                    <h3>{item.prompt}</h3>
                    <p>
                      {submission.answers[item.key]?.state === 'answered'
                        ? 'Answered'
                        : 'Skipped'}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSubmission({
                        ...submission,
                        currentStep: item.number - 1,
                      })

                      setDraft(submission.answers[item.key] ?? emptyAnswer())
                      setScreen('question')
                    }}
                  >
                    Edit<span className="sr-only"> question {item.number}</span>
                  </button>
                </article>
              ))}
          </section>
        ))}
        {error && <p className="error">{error}</p>}
        <div className="submit-bar">
          <div>
            <strong>Ready for your workflow check?</strong>
            <span>Your results do not require an email.</span>
          </div>
          <button disabled={saveState === 'saving'} onClick={submit}>
            See my results
          </button>
        </div>
      </main>
    )
  }

  if (!question) {
    return (
      <main className="narrow center">
        <h1>Assessment complete</h1>
      </main>
    )
  }

  return (
    <main className="narrow question-page">
      <div className="progress-row">
        <span>{category?.label}</span>
        <span>
          Question {question.number} of {questionnaire.questions.length}
        </span>
      </div>
      <div className="progress-track">
        <span
          style={{
            width: `${(question.number / questionnaire.questions.length) * 100}%`,
          }}
        />
      </div>
      <p className="eyebrow">{question.required ? 'Required' : 'Optional'}</p>
      <h1 ref={heading} tabIndex={-1}>
        {question.prompt}
      </h1>
      {question.instructions && (
        <p className="question-help">{question.instructions}</p>
      )}
      <QuestionField
        question={question}
        value={currentAnswer}
        onChange={(value) => {
          setDraft(value)
          setError('')
          setSaveState('idle')
        }}
        error={error}
      />
      <div className="question-actions">
        <button
          className="secondary"
          disabled={submission.currentStep === 0}
          onClick={() => {
            setSubmission({
              ...submission,
              currentStep: Math.max(0, submission.currentStep - 1),
            })

            setDraft(emptyAnswer())
          }}
        >
          Back
        </button>
        <div className={`save-state ${saveState}`} aria-live="polite">
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : ''}
        </div>
        <button disabled={saveState === 'saving'} onClick={goNext}>
          {question.number === questionnaire.questions.length
            ? 'Review answers'
            : 'Next'}
        </button>
      </div>
    </main>
  )
}
