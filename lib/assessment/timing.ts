export const MINIMUM_ASSESSMENT_LOADING_DURATION_MS = 1_000
export const MINIMUM_RESULTS_PROCESSING_DURATION_MS = 1_200

export const remainingMinimumDuration = (
  startedAt: number,
  minimumDuration: number,
  now = Date.now()
) => Math.max(0, minimumDuration - (now - startedAt))

export const waitForMinimumDuration = (
  startedAt: number,
  minimumDuration: number
) => {
  const remainingDuration = remainingMinimumDuration(startedAt, minimumDuration)

  if (!remainingDuration) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, remainingDuration)
  })
}
