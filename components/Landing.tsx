'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { Landing as LandingContent } from '@/lib/assessment/contracts'
import { browserAssessmentAdapter } from '@/lib/assessment/browserAdapter'

export const Landing = () => {
  const [landing, setLanding] = useState<LandingContent | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void browserAssessmentAdapter
      .getLanding()
      .then((content) => {
        if (active) {
          setLanding(content)
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'This assessment is temporarily unavailable. Please try again shortly.'
          )
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <main className="narrow center">
        <h1>Assessment unavailable</h1>
        <p className="lede">{error}</p>
      </main>
    )
  }

  if (!landing) {
    return (
      <main className="narrow center" aria-live="polite">
        <h1>Workflow health check</h1>
        <p>Loading assessment…</p>
      </main>
    )
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">A clearer way through the busywork</p>
          <h1>{landing.headline}</h1>
          <p className="lede">{landing.supporting}</p>
          <div className="actions">
            <Link className="button" href={`/q/${landing.questionnaireId}`}>
              {landing.buttonLabel}
            </Link>
            <span className="privacy">
              No email needed to see your results.
            </span>
          </div>
        </div>
      </section>
      <section className="audience">
        <p className="eyebrow">Who it’s for</p>
        <h2>{landing.audienceTitle}</h2>
        <p>{landing.audience}</p>
      </section>
      <section className="how">
        <p className="eyebrow">How it works</p>
        <div className="step-grid">
          {landing.steps.map((step, index) => (
            <article key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
