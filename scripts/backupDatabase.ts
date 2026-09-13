import { execFile } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import nextEnv from '@next/env'

const execFileAsync = promisify(execFile)

const main = async () => {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development')
  const databaseURL = process.env.DATABASE_URL
  const backupDirectory = process.env.BACKUP_DIRECTORY

  if (!databaseURL || !backupDirectory) {
    throw new Error(
      'DATABASE_URL and BACKUP_DIRECTORY are required for a backup'
    )
  }

  await mkdir(backupDirectory, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  const outputPath = path.resolve(
    backupDirectory,
    `workflow-health-${timestamp}.dump`
  )

  if (!outputPath.startsWith(`${path.resolve(backupDirectory)}${path.sep}`)) {
    throw new Error('Backup output must remain within BACKUP_DIRECTORY')
  }

  await execFileAsync('pg_dump', [
    '--format=custom',
    '--file',
    outputPath,
    databaseURL,
  ])

  console.log(`Backup created: ${outputPath}`)
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Database backup failed'
  )

  process.exitCode = 1
})
