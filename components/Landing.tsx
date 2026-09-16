'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ImCheckmark,
  ImEye,
  ImMagicWand,
  ImTarget,
  ImWrench,
} from 'react-icons/im'

import type { Landing as LandingContent } from '@/lib/assessment/contracts'
import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'

const benefits = [
  {
    icon: ImEye,
    title: 'Understand your workflow',
    text: 'See the patterns behind the work that keeps piling up.',
  },
  {
    icon: ImWrench,
    title: 'Identify friction',
    text: 'Spot where small changes could make your work easier to manage.',
  },
  {
    icon: ImTarget,
    title: 'Find practical next steps',
    text: 'Get clear, grounded suggestions based on your answers.',
  },
  {
    icon: ImMagicWand,
    title: 'Made for creative work',
    text: 'A reflective assessment for independent and small creative teams.',
  },
]

const faqs = [
  {
    question: 'Do I need to create an account?',
    answer:
      'No. You can answer the assessment and view your results without creating an account.',
  },
  {
    question: 'Can I get my report by email?',
    answer:
      'Email is optional. If analysis is still finishing, you can choose to be notified when your private report is ready.',
  },
  {
    question: 'What happens after I answer the questions?',
    answer:
      'Your answers are saved and analysed to prepare a tailored report. In some cases, we may ask one follow-up question to make the result clearer.',
  },
  {
    question: 'What does the report include?',
    answer:
      'It highlights the most important areas to address, explains why they matter, and suggests a practical first step for each one.',
  },
]

export const Landing = ({
  initialLanding = null,
  initialError = '',
}: {
  initialLanding?: LandingContent | null
  initialError?: string
}) => {
  const [landing, setLanding] = useState<LandingContent | null>(initialLanding)
  const [error, setError] = useState(initialError)

  const loadLanding = useCallback(() => {
    setError('')

    void browserAssessmentAdapter
      .getLanding()
      .then(setLanding)
      .catch(() =>
        setError(
          'This assessment is temporarily unavailable. Please try again shortly.'
        )
      )
  }, [])

  useEffect(() => {
    if (!initialLanding && !initialError) {
      loadLanding()
    }
  }, [initialError, initialLanding, loadLanding])

  if (error) {
    return (
      <main className="marketing-state" aria-live="polite">
        <h1>Assessment unavailable</h1>
        <p className="lede">{error}</p>
        <button
          type="button"
          className="marketing-button"
          onClick={loadLanding}
        >
          Try again
        </button>
      </main>
    )
  }

  if (!landing) {
    return (
      <main className="marketing-state" aria-live="polite">
        <h1>Workflow check</h1>
        <p>Loading assessment…</p>
      </main>
    )
  }

  const assessmentHref = `/q/${landing.questionnaireId}`

  return (
    <main className="marketing-page">
      <section className="marketing-hero" id="assessment">
        <div className="marketing-container marketing-hero__grid">
          <div className="marketing-hero__content">
            <p className="eyebrow">A clearer way to work</p>
            <h1>{landing.headline}</h1>
            <p className="lede">{landing.supporting}</p>
            <Link className="marketing-button" href={assessmentHref}>
              {landing.buttonLabel} <span aria-hidden="true">→</span>
            </Link>
            <ul className="marketing-facts" aria-label="Assessment details">
              <li>
                <ImCheckmark aria-hidden="true" />
                No account required
              </li>
              <li>
                <ImCheckmark aria-hidden="true" />
                Results are shown here
              </li>
              <li>
                <ImCheckmark aria-hidden="true" />
                Email is optional
              </li>
            </ul>
          </div>
          <div className="marketing-hero__image">
            <Image
              src="/images/creative-workspace.png"
              alt="A calm creative workspace with a desk, chair, and plant."
              fill
              preload
              sizes="(max-width: 959px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
      <section className="marketing-band" id="about">
        <div className="marketing-container">
          <div className="marketing-intro">
            <p className="eyebrow">Built for creative minds</p>
            <h2>{landing.audienceTitle}</h2>
            <p>{landing.audience}</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="benefit-card">
                <span className="benefit-icon" aria-hidden="true">
                  <benefit.icon />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="marketing-section report-preview">
        <div className="marketing-container report-preview__grid">
          <div>
            <p className="eyebrow">Your personalised report</p>
            <h2>A clearer view of what to work on next.</h2>
            <p className="lede">
              Answer a few focused questions, then use your results to see where
              your workflow could feel lighter and more intentional.
            </p>
            <Link className="marketing-button" href={assessmentHref}>
              {landing.buttonLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="report-example" aria-label="Example report layout">
            <div
              className="report-example__orb report-example__orb--green"
              aria-hidden="true"
            />
            <div
              className="report-example__orb report-example__orb--blue"
              aria-hidden="true"
            />
            <div className="report-example__cover">
              <span>WORKFLOW CHECK</span>
              <strong>
                Example
                <br />
                report
              </strong>
              <small>Patterns. Priorities. Next steps.</small>
            </div>
            <div className="report-example__details">
              <p>EXAMPLE REPORT</p>
              <h3>Key insights</h3>
              <div>
                <b>01</b>
                <span>
                  Workflow patterns<small>What your answers suggest.</small>
                </span>
              </div>
              <div>
                <b>02</b>
                <span>
                  Areas to explore<small>A practical place to begin.</small>
                </span>
              </div>
              <div>
                <b>03</b>
                <span>
                  Next step<small>One change worth trying.</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="marketing-band" id="how-it-works">
        <div className="marketing-container">
          <p className="eyebrow">How it works</p>
          <h2>From questions to clearer next steps.</h2>
          <ol className="marketing-steps">
            {landing.steps.map((step, index) => (
              <li key={step.title}>
                <span className="step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="marketing-section" id="faq">
        <div className="marketing-container faq-layout">
          <div>
            <p className="eyebrow">Questions?</p>
            <h2>You might find the answer here.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question} name="faq">
                <summary>
                  {faq.question}
                  <span aria-hidden="true">⌄</span>
                </summary>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="closing-cta">
        <div className="marketing-container">
          <h2>Ready for a clearer way to work?</h2>
          <Link className="marketing-button" href={assessmentHref}>
            {landing.buttonLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
