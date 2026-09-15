import { existsSync, readFileSync } from 'node:fs'

import { assertDisposableTestDatabase } from '@/server/operations/testDatabase'

const environmentFile = '.env'

if (existsSync(environmentFile)) {
  for (const line of readFileSync(environmentFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2]
    }
  }
}

assertDisposableTestDatabase(process.env)
