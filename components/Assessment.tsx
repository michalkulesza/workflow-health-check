'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  categories,
  QUESTIONNAIRE_ID,
  questions,
  reportFixtures,
  scenarioLabels,
} from '@/lib/fixtures'
import {
  blankProgress,
  createMockServices,
  sampleAnswers,
} from '@/lib/mock-services'
import { formatAnswerForReview } from '@/lib/formatAnswerForReview'
import type { Answer, Progress, ReportResult, Scenario } from '@/lib/types'
import { QuestionField } from './QuestionField'
import { ResultsView } from './ResultsView'

type Screen = 'question' | 'review' | 'processing' | 'clarification' | 'results'
const validScenarios = new Set(Object.keys(scenarioLabels))

const validation = (question: (typeof questions)[number], answer?: Answer) => {
  if (question.required) {
    if (question.type === 'text' && !answer?.text?.trim()) {
      return 'Please add an answer before continuing.'
    }

    if (question.type !== 'text' && !answer?.selected?.length) {
      return 'Choose an answer before continuing.'
    }
  }

  for (const id of answer?.selected ?? []) {
    const option = question.options?.find((o) => o.id === id)

    if (option?.requiresText && !answer?.otherText?.[id]?.trim()) {
      return 'Please add details for the selected option.'
    }
  }

  return ''
}
export const Assessment = ({
  questionnaireId,
  initialScenario,
}: {
  questionnaireId: string
  initialScenario?: string
}) => {
  const scenario = (
    initialScenario && validScenarios.has(initialScenario)
      ? initialScenario
      : 'happy'
  ) as Scenario
  const [services] = useState(() => createMockServices(questionnaireId))
  const [progress, setProgress] = useState<Progress>(blankProgress)
  const [screen, setScreen] = useState<Screen>('question')
  const [ready, setReady] = useState(false)

  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReportResult | null>(null)
  const [clarification, setClarification] = useState('')
  const [clarificationPrompt, setClarificationPrompt] = useState('')
  const [clarified, setClarified] = useState(false)
  const [failedOnce, setFailedOnce] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const isSaving = useRef(false)

  useEffect(() => {
    if (questionnaireId !== QUESTIONNAIRE_ID) {
      setReady(true)

      return
    }

    if (initialScenario && scenario !== 'happy') {
      const atQuestion = scenario === 'resume' || scenario === 'save-failure'

      const p = {
        ...blankProgress(),
        answers: sampleAnswers,
        step: scenario === 'resume' ? 7 : scenario === 'save-failure' ? 4 : 15,
        status: atQuestion ? 'in-progress' : 'review',
      } as Progress
      setProgress(p)
      setScreen(atQuestion ? 'question' : 'review')
    } else {
      const saved = services.loadProgress()

      if (saved?.version) {
        setProgress(saved)

        setScreen(
          saved.status === 'review'
            ? 'review'
            : saved.status === 'complete'
              ? 'results'
              : 'question'
        )
      }
    }

    setReady(true)
  }, [initialScenario, questionnaireId, scenario, services])

  useEffect(() => {
    if (ready) {
      requestAnimationFrame(() => heading.current?.focus())
    }
  }, [progress.step, screen, ready])

  if (questionnaireId !== QUESTIONNAIRE_ID) {
    return (
      <main className="narrow center">
        <h1>Assessment not found</h1>
        <p>This questionnaire link isn’t available.</p>
        <Link className="button" href="/">
          Return home
        </Link>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="narrow center">
        <p>Loading your assessment…</p>
      </main>
    )
  }

  const question = questions[progress.step]
  const category = categories.find((c) => c.id === question?.categoryId)
  const answer = progress.answers[question?.id] ?? {}

  const save = async (next: Progress) => {
    if (isSaving.current) {
      return false
    }

    isSaving.current = true
    setSaveState('saving')

    try {
      if (scenario === 'save-failure' && !failedOnce) {
        setFailedOnce(true)
        throw Error('simulated')
      }

      await services.saveProgress(next)
      setSaveState('saved')

      return true
    } catch {
      setSaveState('error')

      return false
    } finally {
      isSaving.current = false
    }
  }

  const update = (value: Answer) => {
    setError('')
    setSaveState('idle')

    setProgress((p) => ({
      ...p,
      answers: { ...p.answers, [question.id]: value },
      updatedAt: new Date().toISOString(),
    }))
  }

  const next = async () => {
    const message = validation(question, answer)

    if (message) {
      setError(message)

      return
    }

    const isLast = progress.step === questions.length - 1

    const nextProgress = {
      ...progress,
      step: isLast ? progress.step : progress.step + 1,
      status: isLast ? 'review' : 'in-progress',
      updatedAt: new Date().toISOString(),
    } as Progress

    if (await save(nextProgress)) {
      setProgress(nextProgress)

      if (isLast) {
        setScreen('review')
      }
    }
  }
  const retrySave = () => save(progress)

  const analyse = async () => {
    for (const q of questions) {
      const message = validation(q, progress.answers[q.id])

      if (message) {
        setProgress((p) => ({
          ...p,
          step: q.number - 1,
          status: 'in-progress',
        }))

        setScreen('question')
        setError(message)

        return
      }
    }
    setScreen('processing')
    const response = await services.analyse(scenario, clarified)

    if (response.clarification) {
      setClarificationPrompt(response.clarification)
      setScreen('clarification')
    } else if (response.result) {
      const completed = { ...progress, status: 'complete' } as Progress
      await services.saveProgress(completed)
      setProgress(completed)
      setResult(response.result)
      setScreen('results')
    }
  }

  const submitClarification = async () => {
    if (!clarification.trim()) {
      setError('Please add a specific example before continuing.')

      return
    }

    setError('')
    setSaveState('saving')

    await services.saveProgress({
      ...progress,
      answers: { ...progress.answers, clarification: { text: clarification } },
    })

    setSaveState('saved')
    setClarified(true)
    setScreen('processing')
    const response = await services.analyse(scenario, true)

    if (response.result) {
      setResult(response.result)
      setScreen('results')
    }
  }

  const reset = () => {
    localStorage.removeItem(
      `workflow-check:${questionnaireId}:creative-workflow-v1`
    )

    location.href = `/q/${questionnaireId}${initialScenario ? `?scenario=${initialScenario}` : ''}`
  }

  if (screen === 'processing') {
    return (
      <main className="narrow processing" aria-live="polite">
        <div className="loader" />
        <p className="eyebrow">Reviewing your answers</p>
        <h1 tabIndex={-1} ref={heading}>
          {scenario === 'ai-failure'
            ? 'The reflection analysis is taking longer than expected'
            : 'Looking for the clearest priorities…'}
        </h1>
        <p>
          We’re comparing the answers you gave and preparing a focused result.
          This should only take a moment in the prototype.
        </p>
      </main>
    )
  }

  if (screen === 'clarification') {
    return (
      <main className="narrow question-page">
        <p className="eyebrow">One extra step</p>
        <h1 tabIndex={-1} ref={heading}>
          {clarificationPrompt}
        </h1>
        <p className="question-help">
          A concrete example helps distinguish everyday pressure from a workflow
          that repeatedly loses control. We’ll only ask this once.
        </p>
        <textarea
          rows={7}
          value={clarification}
          onChange={(e) => setClarification(e.target.value)}
          aria-describedby={error ? 'clarify-error' : undefined}
        />
        {error && (
          <p id="clarify-error" className="error">
            {error}
          </p>
        )}
        <div className="question-actions">
          <button
            disabled={saveState === 'saving'}
            onClick={submitClarification}
          >
            {saveState === 'saving' ? 'Saving…' : 'Continue analysis'}
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'results') {
    return (
      <ResultsView
        result={
          result ??
          (scenario === 'healthy' ? reportFixtures.healthy : reportFixtures.two)
        }
        scenario={scenario}
      />
    )
  }

  if (screen === 'review') {
    return (
      <main className="wide review">
        <div className="review-head">
          <div>
            <p className="eyebrow">Ready to review</p>
            <h1 tabIndex={-1} ref={heading}>
              Your answers
            </h1>
            <p>
              Check anything you want to change. Optional questions you skipped
              stay unscored.
            </p>
          </div>
          <button className="secondary small" onClick={reset}>
            Reset prototype
          </button>
        </div>
        {categories.map((cat) => {
          const qs = questions.filter((q) => q.categoryId === cat.id)

          return (
            <section className="review-group" key={cat.id}>
              <h2>{cat.name}</h2>
              {qs.map((q) => {
                const display = formatAnswerForReview(q, progress.answers[q.id])

                return (
                  <article key={q.id}>
                    <div>
                      <span>Q{q.number}</span>
                      <h3>{q.prompt}</h3>
                      <p className={!display ? 'skipped' : ''}>
                        {display || 'Skipped (optional)'}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setProgress((p) => ({
                          ...p,
                          step: q.number - 1,
                          status: 'in-progress',
                        }))

                        setScreen('question')
                      }}
                    >
                      Edit<span className="sr-only"> question {q.number}</span>
                    </button>
                  </article>
                )
              })}
            </section>
          )
        })}
        <div className="submit-bar">
          <div>
            <strong>Ready for your workflow check?</strong>
            <span>Your results do not require an email.</span>
          </div>
          <button onClick={analyse}>See my results</button>
        </div>
      </main>
    )
  }

  return (
    <main className="narrow question-page">
      <div className="progress-row">
        <span>{category?.name}</span>
        <span>
          Question {question.number} of {questions.length}
        </span>
      </div>
      <div className="progress-track">
        <span
          style={{ width: `${(question.number / questions.length) * 100}%` }}
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
        value={answer}
        onChange={update}
        error={error}
      />
      <div className="question-actions">
        <button
          className="secondary"
          disabled={question.number === 1}
          onClick={() =>
            setProgress((p) => ({ ...p, step: Math.max(0, p.step - 1) }))
          }
        >
          Back
        </button>
        <div className={`save-state ${saveState}`} aria-live="polite">
          {saveState === 'saving' ? (
            'Saving…'
          ) : saveState === 'saved' ? (
            'Saved'
          ) : saveState === 'error' ? (
            <>
              <span>Couldn’t save.</span>{' '}
              <button className="text-button" onClick={retrySave}>
                Try again
              </button>
            </>
          ) : (
            ''
          )}
        </div>
        <button onClick={next}>
          {question.number === questions.length ? 'Review answers' : 'Next'}
        </button>
      </div>
      <button className="reset-link" onClick={reset}>
        Reset prototype progress
      </button>
    </main>
  )
}
