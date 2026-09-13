import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import { Admins } from './server/collections/Admins'
import { Answers } from './server/collections/Answers'
import { Questionnaires } from './server/collections/Questionnaires'
import { QuestionnaireVersions } from './server/collections/QuestionnaireVersions'
import { Submissions } from './server/collections/Submissions'
import { publishEndpoint } from './server/content/publishEndpoint'
import { LandingPage } from './server/globals/LandingPage'
import { fixtureTask } from './server/jobs/fixtureTask'

const baseDir = path.dirname(fileURLToPath(import.meta.url))
const secret = process.env.PAYLOAD_SECRET
const connectionString = process.env.DATABASE_URL

if (!secret || secret.length < 32) {
  throw new Error('Set PAYLOAD_SECRET to at least 32 characters in .env.local')
}

if (!connectionString) {
  throw new Error(
    'Set DATABASE_URL to a disposable PostgreSQL database for the spike'
  )
}

export default buildConfig({
  secret,
  admin: { user: 'admins', importMap: { baseDir } },
  collections: [
    Admins,
    Questionnaires,
    QuestionnaireVersions,
    Submissions,
    Answers,
  ],
  globals: [LandingPage],
  endpoints: [
    {
      method: 'post',
      path: '/admin-content/questionnaires/:id/publish',
      handler: publishEndpoint,
    },
  ],
  db: postgresAdapter({
    pool: { connectionString },
    migrationDir: path.join(baseDir, 'server', 'migrations'),
    // Explicit opt-in only for the disposable compatibility database.
    push:
      process.env.PAYLOAD_SCHEMA_PUSH === 'true' &&
      process.env.NODE_ENV !== 'production',
  }),
  graphQL: { disable: true },
  jobs: {
    access: { run: () => false, queue: () => false, cancel: () => false },
    deleteJobOnComplete: false,
    tasks: [fixtureTask],
  },
  typescript: { outputFile: path.join(baseDir, 'payload-types.ts') },
})
