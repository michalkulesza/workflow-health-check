export const isAllowedAssessmentOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')

  if (!origin) {
    return false
  }

  if (process.env.NODE_ENV === 'production' && process.env.APP_ORIGIN) {
    return origin === process.env.APP_ORIGIN
  }

  const requestURL = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  const forwardedProtocol = request.headers.get('x-forwarded-proto')

  const protocol =
    forwardedProtocol?.split(',')[0]?.trim().replace(/:$/, '') ??
    requestURL.protocol.replace(/:$/, '')
  const expectedOrigin = host ? `${protocol}://${host}` : requestURL.origin

  return origin === expectedOrigin
}
