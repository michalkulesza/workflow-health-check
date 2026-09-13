import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'

import { Admins } from './server/collections/Admins'
import { AnonymousSessions } from './server/collections/AnonymousSessions'
import { Answers } from './server/collections/Answers'
import { AnswerMutations } from './server/collections/AnswerMutations'
import { Questionnaires } from './server/collections/Questionnaires'
import { QuestionnaireVersions } from './server/collections/QuestionnaireVersions'
import { Submissions } from './server/collections/Submissions'
import { ScoringRuns } from './server/collections/ScoringRuns'
import { ScoringResults } from './server/collections/ScoringResults'
import { AssessmentOutbox } from './server/collections/AssessmentOutbox'
import { publishEndpoint } from './server/content/publishEndpoint'
import { LandingPage } from './server/globals/LandingPage'
import { fixtureTask } from './server/jobs/fixtureTask'
import { deterministicScoreTask } from './server/jobs/deterministicScoreTask'
import { aiEvaluationTask } from './server/jobs/aiEvaluationTask'

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
    AnonymousSessions,
    Questionnaires,
    QuestionnaireVersions,
    Submissions,
    ScoringRuns,
    ScoringResults,
    AssessmentOutbox,
    Answers,
    AnswerMutations,
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
    tasks: [fixtureTask, deterministicScoreTask, aiEvaluationTask],
  },
  typescript: { outputFile: path.join(baseDir, 'payload-types.ts') },
})
