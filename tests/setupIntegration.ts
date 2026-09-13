import { readFileSync } from 'node:fs'

const environmentFile = '.env.development.local'

if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
  throw new Error(
    'Set RUN_INTEGRATION_TESTS=true to run database integration tests'
  )
}

for (const line of readFileSync(environmentFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

  if (match) {
    process.env[match[1]] = match[2]
  }
}

if (!process.env.DATABASE_URL?.includes('workflow_spike')) {
  throw new Error(
    'Integration tests require the disposable workflow_spike database'
  )
}
