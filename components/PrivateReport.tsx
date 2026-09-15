'use client'

import { useEffect, useRef, useState } from 'react'

import { reportSchema, type Report } from '@/lib/assessment/contracts'

import { ResultsView } from './ResultsView'

export const PrivateReport = ({ token }: { token: string }) => {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const exchangeAttempted = useRef(false)

  useEffect(() => {
    exchangeAttempted.current = false
  }, [token])

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        setError('')
        if (!exchangeAttempted.current) {
          exchangeAttempted.current = true
          const exchange = await fetch(
            '/api/assessment/v1/report-grants/exchange',
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token }),
            }
          )

          if (!exchange.ok) {
            throw new Error(exchange.status >= 500 ? 'temporary' : 'invalid')
          }
        }

        const response = await fetch(
          '/api/assessment/v1/report-grants/current',
          { credentials: 'include' }
        )

        if (!response.ok) {
          throw new Error(response.status >= 500 ? 'temporary' : 'invalid')
        }

        const content = reportSchema.parse(await response.json())

        if (active) {
          setReport(content)
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error && reason.message === 'invalid'
              ? 'This link is invalid, expired, or has already been used.'
              : 'Your report is temporarily unavailable. Please try again.'
          )
        }
      }
    })()

    return () => {
      active = false
    }
  }, [retry, token])

  if (error) {
    return (
      <main className="narrow center">
        <p className="eyebrow">Report link</p>
        <h1>Report unavailable</h1>
        <p className="lede">{error}</p>
        {error.includes('temporarily') && (
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </button>
        )}
      </main>
    )
  }

  if (!report) {
    return (
      <main className="narrow center" aria-live="polite">
        <p>Opening your private report…</p>
      </main>
    )
  }

  return <ResultsView report={report} />
}
