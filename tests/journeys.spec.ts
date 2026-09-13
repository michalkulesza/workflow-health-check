import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const questionnaireID = process.env.E2E_QUESTIONNAIRE_ID ?? ''

test('public assessment pages are accessible, noindex, and free of prototype controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('main')).toBeVisible()

  await expect(
    page.getByText(/prototype scenarios|developer mode/i)
  ).toHaveCount(0)

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBe(true)

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.goto(`/q/${questionnaireID}`)
  await expect(page.getByRole('main')).toBeVisible()

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/
  )

  await expect(
    page.getByText(/prototype scenarios|developer mode/i)
  ).toHaveCount(0)

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('private and invalid routes fail closed without fixture bypasses', async ({
  page,
}) => {
  const privateResponse = await page.request.get(
    '/api/assessment/v1/submissions/00000000-0000-0000-0000-000000000000'
  )

  expect(privateResponse.status()).toBe(401)
  expect(privateResponse.headers()['cache-control']).toContain('no-store')

  await page.goto('/report/ready-demo')

  await expect(
    page.getByRole('heading', { name: 'Report unavailable' })
  ).toBeVisible()
})
