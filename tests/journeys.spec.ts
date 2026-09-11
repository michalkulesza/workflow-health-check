import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const q = '/q/5dc13945-9cb8-4e6b-b504-187c885e0e34'

test('landing and mobile question flow enforce Q3 limit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /Find the friction/ })
  ).toBeVisible()

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBe(true)

  await page.getByRole('link', { name: /Check your workflow/ }).click()
  await page.getByLabel('Producer').check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByLabel('1–2').check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  for (const name of [
    'Finding information/files',
    'Email/messages',
    'Following up with people',
    'Scheduling',
  ]) {
    await page.getByLabel(name).check()
  }
  await page.getByLabel('Contracts/agreements').click()
  await expect(page.getByLabel('Contracts/agreements')).not.toBeChecked()
})

test('save failure preserves input and recovers', async ({ page }) => {
  await page.goto(`${q}?scenario=save-failure`)

  await expect(
    page.getByRole('heading', { name: /Where does the information/ })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Couldn’t save.')).toBeVisible()
  await expect(page.getByLabel('Google Drive / Dropbox')).toBeChecked()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
})

test('one priority and clarification journeys complete', async ({ page }) => {
  await page.goto(`${q}?scenario=one`)
  await page.getByRole('button', { name: 'See my results' }).click()
  await expect(page.getByText('Priority 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Priority 2', { exact: true })).toHaveCount(0)
  await page.goto(`${q}?scenario=clarification`)
  await page.getByRole('button', { name: 'See my results' }).click()
  await expect(page.getByText('One extra step')).toBeVisible()

  await page
    .locator('textarea')
    .fill(
      'I use one checklist, then update dates and tell collaborators when a revision changes the plan.'
    )

  await page.getByRole('button', { name: 'Continue analysis' }).click()
  await expect(page.getByText('Priority 1', { exact: true })).toBeVisible()
})

test('notification and contact failures retain recoverable forms', async ({
  page,
}) => {
  await page.goto(`${q}?scenario=notification-error`)
  await page.getByRole('button', { name: 'See my results' }).click()

  await expect(
    page.getByRole('heading', { name: /still processing/ })
  ).toBeVisible()

  await page.getByLabel('Email for the report notification').fill('invalid')
  await page.getByRole('button', { name: 'Notify me when ready' }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()

  await page
    .getByLabel('Email for the report notification')
    .fill('review@example.test')

  await page.getByRole('button', { name: 'Notify me when ready' }).click()
  await expect(page.getByText(/couldn’t save that request/i)).toBeVisible()
  await page.goto(`${q}?scenario=contact-error`)
  await page.getByRole('button', { name: 'See my results' }).click()
  await page.getByRole('button', { name: 'Request help' }).click()

  await expect(
    page.getByRole('heading', { name: 'Tell us where you’d like help' })
  ).toBeVisible()

  await expect(page.getByText('Priority 1', { exact: true })).toHaveCount(0)
  await page.getByLabel(/^Email/).fill('review@example.test')
  await page.getByLabel(/^Name/).fill('Prototype Reviewer')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByText(/couldn’t save your request/i)).toBeVisible()
  await expect(page.getByLabel(/^Name/)).toHaveValue('Prototype Reviewer')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByText(/request has been recorded/i)).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'Return to results' })
  ).toBeVisible()
})

test('report links show ready and expired states', async ({ page }) => {
  await page.goto('/report/ready-demo')
  await expect(page.getByText('Priority 1', { exact: true })).toBeVisible()
  await page.goto('/report/expired')

  await expect(
    page.getByRole('heading', { name: 'This link has expired' })
  ).toBeVisible()
})

test('core pages have no automatically detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.goto(`${q}?scenario=healthy`)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'See my results' }).press('Enter')

  await expect(
    page.getByRole('heading', { name: 'No major issues identified' })
  ).toBeVisible()

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
