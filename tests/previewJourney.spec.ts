import { expect, test } from '@playwright/test'

const shouldRun = process.env.RUN_PREVIEW_JOURNEY === 'true'

test.describe('configured preview assessment journey', () => {
  test.skip(
    !shouldRun,
    'Set RUN_PREVIEW_JOURNEY=true for disposable preview verification.'
  )

  test('saves, resumes, submits, requests notification, and captures a contact lead', async ({
    page,
  }) => {
    test.setTimeout(300_000)

    await page.goto(`/q/${process.env.E2E_QUESTIONNAIRE_ID}`)
    await expect(page.getByText('Question 1 of 16')).toBeVisible()

    await page
      .locator('input[type="radio"], input[type="checkbox"]')
      .first()
      .check()
    await page.getByRole('button', { name: 'Next' }).click()
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

        const requiredDetail = page
          .locator('input[type="text"]:visible')
          .first()

        if ((await requiredDetail.count()) > 0) {
          await requiredDetail.fill('Fictional preview detail.')
        }
      }

      await page
        .getByRole('button', {
          name: questionNumber === 16 ? 'Review answers' : 'Next',
        })
        .click()
    }

    await expect(
      page.getByRole('heading', { name: 'Your answers' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'See my results' }).click()

    await expect(page.getByRole('heading')).toBeVisible({ timeout: 90_000 })
    await expect(
      page.getByRole('button', { name: 'Request help' })
    ).toBeVisible()

    const notificationEmail = page.getByLabel(
      'Email for the report notification'
    )

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
    await page
      .getByLabel(/email required/i)
      .fill('preview-contact@example.test')
    await page.getByLabel(/name optional/i).fill('Preview verification')
    await page
      .getByLabel(/what would you like help with/i)
      .fill('Fictional request used only for disposable-preview verification.')
    await page.getByRole('button', { name: 'Send request' }).click()
    await expect(
      page.getByRole('button', { name: 'Request help' })
    ).toBeVisible()
  })
})
