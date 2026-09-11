import { getScoringDebugRows } from '@/lib/scoringDebug'
import type { Answers } from '@/lib/types'

interface ScoringDebugPanelProps {
  answers: Answers
  currentQuestionId?: string
}

const formatScore = (score: number | null) =>
  score === null ? '—' : score.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

export const ScoringDebugPanel = ({
  answers,
  currentQuestionId,
}: ScoringDebugPanelProps) => {
  if (process.env.NEXT_PUBLIC_SCORING_DEBUG !== 'true') {
    return null
  }

  const rows = getScoringDebugRows(answers).filter(
    ({ questionId }) => !currentQuestionId || questionId === currentQuestionId
  )

  return (
    <aside className="scoring-debug" aria-label="Scoring debug information">
      <div className="scoring-debug-heading">
        <div>
          <span>DEVELOPER MODE</span>
          <h2>Live scoring</h2>
        </div>
        <code>NEXT_PUBLIC_SCORING_DEBUG=true</code>
      </div>
      <div className="scoring-debug-rows">
        {rows.map((row) => (
          <article key={row.questionId}>
            <div className="scoring-debug-title">
              <strong>Q{row.questionNumber}</strong>
              <span>{row.categoryName}</span>
              <code>{row.strategy}</code>
            </div>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{row.input}</dd>
              </div>
              <div>
                <dt>Calculation</dt>
                <dd>{row.calculation}</dd>
              </div>
              <div>
                <dt>Normalized</dt>
                <dd>{formatScore(row.normalizedScore)}</dd>
              </div>
              <div>
                <dt>Current point contribution</dt>
                <dd>
                  {row.pointContribution === null
                    ? '—'
                    : row.pointContribution.toFixed(2)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p>
        Point contribution uses the category’s currently usable deterministic
        answers. Context and grouped AI questions do not produce live points.
      </p>
    </aside>
  )
}
