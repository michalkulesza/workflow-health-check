import type { Answer, Question } from '@/lib/types'
export const QuestionField = ({
  question,
  value,
  onChange,
  error,
}: {
  question: Question
  value: Answer
  onChange: (a: Answer) => void
  error?: string
}) => {
  if (question.type === 'text') {
    return (
      <>
        <label className="sr-only" htmlFor={`${question.id}-text`}>
          {question.prompt}
        </label>
        <textarea
          id={`${question.id}-text`}
          rows={7}
          value={value.text ?? ''}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          aria-describedby={error ? `${question.id}-error` : undefined}
          placeholder="Share as much detail as feels useful…"
        />
        {error && (
          <p className="error" id={`${question.id}-error`}>
            {error}
          </p>
        )}
      </>
    )
  }

  const selected = value.selected ?? []

  const toggle = (id: string, exclusive: boolean) => {
    let next: string[]

    if (question.type === 'single') {
      next = [id]
    } else if (exclusive) {
      next = [id]
    } else {
      const exclusiveIds =
        question.options?.filter((o) => o.exclusive).map((o) => o.id) ?? []
      const base = selected.filter((x) => !exclusiveIds.includes(x))
      next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id]

      if (question.maxSelections && next.length > question.maxSelections) {
        return
      }
    }

    onChange({ ...value, selected: next })
  }

  return (
    <fieldset aria-describedby={error ? `${question.id}-error` : undefined}>
      <legend className="sr-only">{question.prompt}</legend>
      <div className="options">
        {question.options?.map((option) => {
          const checked = selected.includes(option.id)

          return (
            <div key={option.id}>
              <label className={`option ${checked ? 'selected' : ''}`}>
                <input
                  type={question.type === 'single' ? 'radio' : 'checkbox'}
                  name={question.id}
                  checked={checked}
                  onChange={() => toggle(option.id, !!option.exclusive)}
                />
                <span className="marker" />
                <span>{option.label}</span>
              </label>
              {checked && option.requiresText && (
                <div className="other-wrap">
                  <label htmlFor={`${question.id}-${option.id}`}>
                    Please add a little detail
                  </label>
                  <input
                    id={`${question.id}-${option.id}`}
                    value={value.otherText?.[option.id] ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        otherText: {
                          ...value.otherText,
                          [option.id]: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <p className="error" id={`${question.id}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
