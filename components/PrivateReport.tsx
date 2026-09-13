'use client'

import { useEffect, useState } from 'react'

import { reportSchema, type Report } from '@/lib/assessment/contracts'

import { ResultsView } from './ResultsView'

export const PrivateReport = ({ token }: { token: string }) => {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    void (async () => {
      try {
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
          throw new Error('exchange')
        }

        const response = await fetch(
          '/api/assessment/v1/report-grants/current',
          { credentials: 'include' }
        )

        if (!response.ok) {
          throw new Error('report')
        }

        const content = reportSchema.parse(await response.json())

        if (active) {
          setReport(content)
        }
      } catch {
        if (active) {
          setError('This link is invalid, expired, or has already been used.')
        }
      }
    })()

    return () => {
      active = false
    }
  }, [token])

  if (error) {
    return (
      <main className="narrow center">
        <p className="eyebrow">Report link</p>
        <h1>Report unavailable</h1>
        <p className="lede">{error}</p>
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
