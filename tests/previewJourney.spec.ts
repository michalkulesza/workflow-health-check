import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const shouldRun = process.env.RUN_PREVIEW_JOURNEY === 'true'
const shouldRunClarification =
  shouldRun && process.env.RUN_PREVIEW_CLARIFICATION === 'true'
const questionnaireID = process.env.E2E_QUESTIONNAIRE_ID ?? ''

const assertAccessible = async (page: Page) => {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
}

const completeJourney = async ({
  page,
  viewport,
  expectClarification = false,
}: {
  page: Page
  viewport: { width: number; height: number }
  expectClarification?: boolean
}) => {
  await page.setViewportSize(viewport)
  await page.goto(`/q/${questionnaireID}`)
  await expect(page.getByText('Question 1 of 16')).toBeVisible()
  await assertAccessible(page)

  const firstOption = page
    .locator('input[type="radio"], input[type="checkbox"]')
    .first()
  await firstOption.focus()
  await page.keyboard.press('Space')
  await expect(firstOption).toBeChecked()

  const next = page.getByRole('button', { name: 'Next' })
  await next.focus()
  await expect(next).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Question 2 of 16')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Question 2 of 16')).toBeVisible()

  for (let questionNumber = 2; questionNumber <= 16; questionNumber += 1) {
    const textarea = page.locator('textarea').first()

    if ((await textarea.count()) > 0) {
      await textarea.fill(
        `Fictional preview evidence for question ${questionNumber}.`
      )
    } else {
      await page
        .locator('input[type="radio"], input[type="checkbox"]')
        .first()
        .check()

      const requiredDetail = page.locator('input[type="text"]:visible').first()

      if ((await requiredDetail.count()) > 0) {
        await requiredDetail.fill('Fictional preview detail.')
      }
    }

    await page
      .getByRole('button', {
        name: questionNumber === 16 ? 'Review answers' : 'Next',
      })
      .click()

    if (questionNumber < 16) {
      await expect(
        page.getByText(`Question ${questionNumber + 1} of 16`)
      ).toBeVisible()
    }
  }

  await expect(
    page.getByRole('heading', { name: 'Your answers' })
  ).toBeVisible()
  await assertAccessible(page)

  await page.getByRole('button', { name: 'See my results' }).click()

  if (expectClarification) {
    await expect(
      page.getByRole('heading', {
        name: 'What changed after you tried to improve this?',
      })
    ).toBeVisible({ timeout: 90_000 })
    await assertAccessible(page)

    await page
      .locator('textarea')
      .fill('The fictional follow-up produced a visible handoff improvement.')
    await page.getByRole('button', { name: 'Continue analysis' }).click()
  }

  await expect(page.getByRole('button', { name: 'Request help' })).toBeVisible({
    timeout: 90_000,
  })
  await assertAccessible(page)

  const notificationEmail = page.getByLabel('Email for the report notification')

  if (await notificationEmail.isVisible().catch(() => false)) {
    await notificationEmail.fill('preview-notification@example.test')
    await page.getByRole('button', { name: 'Notify me when ready' }).click()

    await expect(
      page.getByText(
        /we.ll email this private report link|couldn.t save that request/i
      )
    ).toBeVisible()
  }

  await page.getByRole('button', { name: 'Request help' }).click()
  await expect(
    page.getByRole('heading', { name: /Tell us where you.*like help/i })
  ).toBeVisible()
  await assertAccessible(page)

  await page.getByLabel(/email required/i).fill('preview-contact@example.test')
  await page.getByLabel(/name optional/i).fill('Preview verification')
  await page
    .getByLabel(/what would you like help with/i)
    .fill('Fictional request used only for disposable-preview verification.')

  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByRole('button', { name: 'Request help' })).toBeVisible()
}

test.describe('configured preview assessment journey', () => {
  test.skip(
    !shouldRun,
    'Set RUN_PREVIEW_JOURNEY=true for disposable preview verification.'
  )

  test('completes the desktop journey with keyboard and accessibility checks', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    await completeJourney({ page, viewport: { width: 1440, height: 900 } })
  })

  test('completes the mobile journey with accessibility checks', async ({
    page,
  }) => {
    test.setTimeout(300_000)
    await completeJourney({ page, viewport: { width: 390, height: 844 } })
  })

  test('renders, submits, and checks the clarification screen', async ({
    page,
  }) => {
    test.skip(
      !shouldRunClarification,
      'Set RUN_PREVIEW_CLARIFICATION=true with the isolated clarification transport.'
    )
    test.setTimeout(300_000)
    await completeJourney({
      page,
      viewport: { width: 1440, height: 900 },
      expectClarification: true,
    })
  })
})
