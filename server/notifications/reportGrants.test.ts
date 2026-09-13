import { describe, expect, it } from 'vitest'

import {
  createReportGrantSecrets,
  hashReportGrantSecret,
  reportGrantSecretsMatch,
} from './reportGrants'

describe('report grants', () => {
  it('creates a stable delivery token without retaining raw token material', () => {
    const first = createReportGrantSecrets(42)
    const retry = createReportGrantSecrets(42)

    expect(retry.token).toBe(first.token)
    expect(retry.tokenHash).toBe(first.tokenHash)
    expect(reportGrantSecretsMatch(first.tokenHash, first.token)).toBe(true)
    expect(reportGrantSecretsMatch(first.tokenHash, 'not-the-link')).toBe(false)
  })

  it('scopes session access to the same exchanged report token', () => {
    const grant = createReportGrantSecrets(7)

    expect(hashReportGrantSecret(grant.sessionToken)).toBe(
      grant.sessionTokenHash
    )
  })
})
