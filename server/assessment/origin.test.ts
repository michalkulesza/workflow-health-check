import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAllowedAssessmentOrigin } from './origin'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isAllowedAssessmentOrigin', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('APP_ORIGIN', 'http://192.168.1.125:3000')
  })

  it.each([
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.125:3000',
    '192.168.1.200:3000',
    '10.0.0.20:3000',
  ])(
    'accepts the current host %s with Next forwarded headers regardless of APP_ORIGIN',
    (host) => {
      const request = new Request(
        'http://localhost:3000/api/assessment/v1/sessions',
        {
          headers: {
            host,
            origin: `http://${host}`,
            'x-forwarded-host': host,
            'x-forwarded-proto': 'http',
          },
        }
      )

      expect(isAllowedAssessmentOrigin(request)).toBe(true)
    }
  )

  it('rejects cross-origin requests with forwarded headers', () => {
    const request = new Request(
      'http://localhost:3000/api/assessment/v1/sessions',
      {
        headers: {
          host: '192.168.1.125:3000',
          origin: 'http://untrusted.example',
          'x-forwarded-host': '192.168.1.125:3000',
          'x-forwarded-proto': 'http',
        },
      }
    )

    expect(isAllowedAssessmentOrigin(request)).toBe(false)
  })

  it('rejects requests without an origin', () => {
    expect(
      isAllowedAssessmentOrigin(new Request('http://localhost:3000'))
    ).toBe(false)
  })

  it('does not allow LAN origins to bypass the production origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_ORIGIN', 'https://workflow.example.com')

    expect(
      isAllowedAssessmentOrigin(
        new Request('http://localhost:3000', {
          headers: {
            host: '192.168.1.125:3000',
            origin: 'http://192.168.1.125:3000',
          },
        })
      )
    ).toBe(false)
  })

  it('accepts a development request made through the local network host', () => {
    const request = new Request(
      'http://localhost:3000/api/assessment/v1/sessions',
      {
        headers: {
          host: '192.168.1.20:3000',
          origin: 'http://192.168.1.20:3000',
        },
        method: 'POST',
      }
    )

    expect(isAllowedAssessmentOrigin(request)).toBe(true)
  })

  it('rejects a development request from a different origin', () => {
    const request = new Request(
      'http://localhost:3000/api/assessment/v1/sessions',
      {
        headers: {
          host: '192.168.1.20:3000',
          origin: 'http://192.168.1.21:3000',
        },
        method: 'POST',
      }
    )

    expect(isAllowedAssessmentOrigin(request)).toBe(false)
  })

  it('uses the configured origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_ORIGIN', 'https://workflow.example.com')

    const request = new Request(
      'http://localhost:3000/api/assessment/v1/sessions',
      {
        headers: {
          host: '192.168.1.20:3000',
          origin: 'https://workflow.example.com',
        },
        method: 'POST',
      }
    )

    expect(isAllowedAssessmentOrigin(request)).toBe(true)
  })
})
