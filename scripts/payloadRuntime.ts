import nextEnv from '@next/env'
import { getPayload } from 'payload'

export const loadPayload = async () => {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development')
  const { default: config } = await import('../payload.config')

  return getPayload({ config })
}
