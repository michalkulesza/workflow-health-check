import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import nextEnv from '@next/env'

const execFileAsync = promisify(execFile)

const main = async () => {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development')
  const restoreURL = process.env.RESTORE_DATABASE_URL
  const backupPath = process.argv[2]

  if (process.env.ALLOW_DATABASE_RESTORE !== 'true') {
    throw new Error(
      'Set ALLOW_DATABASE_RESTORE=true to permit a database restore'
    )
  }

  if (!restoreURL || !backupPath) {
    throw new Error('RESTORE_DATABASE_URL and a backup file path are required')
  }

  const resolvedBackupPath = path.resolve(backupPath)
  await access(resolvedBackupPath)

  await execFileAsync('pg_restore', [
    '--clean',
    '--exit-on-error',
    '--if-exists',
    '--no-owner',
    '--dbname',
    restoreURL,
    resolvedBackupPath,
  ])

  console.log(`Restore completed from: ${resolvedBackupPath}`)
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Database restore failed'
  )

  process.exitCode = 1
})
