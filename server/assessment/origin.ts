export const isAllowedAssessmentOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')

  const expectedOrigin =
    process.env.NODE_ENV === 'production' && process.env.APP_ORIGIN
      ? process.env.APP_ORIGIN
      : new URL(request.url).origin

  return origin === expectedOrigin
}
