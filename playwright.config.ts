import { defineConfig } from '@playwright/test'

const localPreview = process.env.E2E_LOCAL_PREVIEW === 'true'
const externalBaseUrl = process.env.E2E_BASE_URL

if (!externalBaseUrl && !localPreview) {
  throw new Error(
    'Set E2E_BASE_URL or E2E_LOCAL_PREVIEW=true before running browser smoke tests.'
  )
}

if (!process.env.E2E_QUESTIONNAIRE_ID) {
  throw new Error('Set E2E_QUESTIONNAIRE_ID to a published questionnaire UUID.')
}

const baseURL = externalBaseUrl ?? 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    browserName: 'chromium',
    launchOptions: process.env.E2E_BROWSER_EXECUTABLE
      ? { executablePath: process.env.E2E_BROWSER_EXECUTABLE }
      : undefined,
  },
  webServer: localPreview
    ? {
        command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
})
