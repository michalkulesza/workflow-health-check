'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  landingContent,
  QUESTIONNAIRE_ID,
  scenarioLabels,
} from '@/lib/fixtures'
import { createMockServices } from '@/lib/mock-services'
import type { Progress } from '@/lib/types'

export const Landing = () => {
  const [saved, setSaved] = useState<Progress | null>(null)

  useEffect(() => {
    try {
      setSaved(createMockServices(QUESTIONNAIRE_ID).loadProgress())
    } catch {
      // Resume is best-effort; an unavailable storage API leaves a fresh start.
    }
  }, [])

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">A clearer way through the busywork</p>
          <h1>{landingContent.headline}</h1>
          <p className="lede">{landingContent.supporting}</p>
          <div className="actions">
            <Link
              className="button"
              href={`/q/${landingContent.questionnaireId}`}
            >
              {saved && saved.status !== 'complete'
                ? 'Continue your assessment'
                : landingContent.buttonLabel}
            </Link>
            <span className="privacy">
              No email needed to see your results.
            </span>
          </div>
        </div>
        <div className="hero-note" aria-label="What you receive">
          <span>YOUR CHECK</span>
          <strong>16 focused questions</strong>
          <strong>Up to 2 priorities</strong>
          <strong>Practical first steps</strong>
        </div>
      </section>
      <section className="audience">
        <p className="eyebrow">Who it’s for</p>
        <h2>{landingContent.audienceTitle}</h2>
        <p>{landingContent.audience}</p>
      </section>
      <section className="how">
        <p className="eyebrow">How it works</p>
        <div className="step-grid">
          {landingContent.steps.map((s, i) => (
            <article key={s.title}>
              <span>0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <details className="scenario-panel">
        <summary>Prototype scenarios</summary>
        <p>
          Jump to a deterministic review state. These controls appear only for
          prototype review.
        </p>
        <div className="scenario-links">
          {Object.entries(scenarioLabels).map(([id, label]) => (
            <Link key={id} href={`/q/${QUESTIONNAIRE_ID}?scenario=${id}`}>
              {label}
            </Link>
          ))}
          <Link href="/report/ready-demo">Report link · ready</Link>
          <Link href="/report/expired">Report link · expired</Link>
        </div>
      </details>
    </main>
  )
}
