import { defineConfig } from '@playwright/test'

const externalBaseUrl = process.env.E2E_BASE_URL
const baseURL = externalBaseUrl ?? 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    browserName: 'chromium',
    launchOptions: {
      executablePath:
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    },
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm.cmd run dev -- --hostname 127.0.0.1 --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
