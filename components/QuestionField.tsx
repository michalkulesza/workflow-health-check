import type { AnswerValue, Questionnaire } from '@/lib/assessment/contracts'

type Question = Questionnaire['questions'][number]

interface QuestionFieldProps {
  question: Question
  value: AnswerValue
  error?: string
  onChange: (value: AnswerValue) => void
}

export const QuestionField = ({
  question,
  value,
  error,
  onChange,
}: QuestionFieldProps) => {
  if (question.type === 'text') {
    return (
      <>
        <label className="sr-only" htmlFor={`${question.key}-text`}>
          {question.prompt}
        </label>
        <textarea
          id={`${question.key}-text`}
          rows={7}
          value={value.state === 'answered' ? (value.text ?? '') : ''}
          onChange={(event) =>
            onChange({
              state: 'answered',
              selectedOptionKeys: [],
              text: event.target.value,
              optionText: {},
            })
          }
          aria-describedby={error ? `${question.key}-error` : undefined}
          placeholder="Share as much detail as feels useful…"
        />
        {error && (
          <p className="error" id={`${question.key}-error`}>
            {error}
          </p>
        )}
      </>
    )
  }

  const selected = value.state === 'answered' ? value.selectedOptionKeys : []
  const optionText = value.state === 'answered' ? value.optionText : {}

  const toggle = (key: string, exclusive: boolean) => {
    const next =
      question.type === 'single' || exclusive
        ? [key]
        : (() => {
            const exclusiveKeys = question.options
              .filter((option) => option.exclusive)
              .map((option) => option.key)

            const base = selected.filter(
              (selectedKey) => !exclusiveKeys.includes(selectedKey)
            )

            const selections = base.includes(key)
              ? base.filter((selectedKey) => selectedKey !== key)
              : [...base, key]

            return question.maxSelections &&
              selections.length > question.maxSelections
              ? selected
              : selections
          })()

    onChange({
      state: 'answered',
      selectedOptionKeys: next,
      text: null,
      optionText,
    })
  }

  return (
    <fieldset aria-describedby={error ? `${question.key}-error` : undefined}>
      <legend className="sr-only">{question.prompt}</legend>
      <div className="options">
        {question.options.map((option) => {
          const checked = selected.includes(option.key)

          return (
            <div key={option.key}>
              <label className={`option ${checked ? 'selected' : ''}`}>
                <input
                  type={question.type === 'single' ? 'radio' : 'checkbox'}
                  name={question.key}
                  checked={checked}
                  onChange={() => toggle(option.key, option.exclusive)}
                />
                <span className="marker" />
                <span>{option.label}</span>
              </label>
              {checked && option.requiresText && (
                <div className="other-wrap">
                  <label htmlFor={`${question.key}-${option.key}`}>
                    Please add a little detail
                  </label>
                  <input
                    id={`${question.key}-${option.key}`}
                    value={optionText[option.key] ?? ''}
                    onChange={(event) =>
                      onChange({
                        state: 'answered',
                        selectedOptionKeys: selected,
                        text: null,
                        optionText: {
                          ...optionText,
                          [option.key]: event.target.value,
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
        <p className="error" id={`${question.key}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
