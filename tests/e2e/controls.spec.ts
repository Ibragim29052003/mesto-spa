import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T09:00:00Z') })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Выбрать программу «Перезагрузка»' })
    .click()
  await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
})

test('focus follows field border without offset or layout movement', async ({
  page,
}) => {
  const name = page.getByLabel('Как к вам обращаться')
  await expect(name).toBeFocused()
  expect(
    await name.evaluate((input) => ({
      offset: getComputedStyle(input).outlineOffset,
      color: getComputedStyle(input).outlineColor,
      width: getComputedStyle(input).outlineWidth,
    })),
  ).toEqual({ offset: '-2px', color: 'rgb(66, 77, 60)', width: '2px' })
  const box = await name.boundingBox()
  await page.getByRole('combobox', { name: 'Ваша программа' }).focus()
  expect(await name.boundingBox()).toEqual(box)
  await name.focus()
  await page
    .locator('.booking-panel')
    .screenshot({ path: 'test-results/screenshots/form-focus.png' })
})

test('custom select supports arrows, Escape, typeahead, Home/End and Tab', async ({
  page,
}) => {
  const select = page.getByRole('combobox', { name: 'Ваша программа' })
  await select.focus()
  await page.keyboard.press('ArrowDown')
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    'program-option-1',
  )
  await page.keyboard.press('Escape')
  await expect(select).toContainText('Перезагрузка')
  await expect(select).toBeFocused()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(select).toContainText('Для двоих')
  await page.keyboard.press('Home')
  await page.keyboard.press('Tab')
  await expect(select).toContainText('Перезагрузка')
  await expect(page.getByLabel('Желаемая дата')).toBeFocused()
  await select.focus()
  // Playwright's US key map inserts Cyrillic text without a keydown event.
  // Dispatch the event produced by a real Russian keyboard, then commit with Enter.
  await select.dispatchEvent('keydown', {
    key: 'Г',
    code: 'KeyU',
    bubbles: true,
    cancelable: true,
  })
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    'program-option-1',
  )
  await page.keyboard.press('Enter')
  await expect(select).toContainText('Глубокий отдых')
  await select.click()
  await page.getByRole('heading', { name: 'Оставьте время для себя.' }).click()
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await expect(select).toContainText('Глубокий отдых')
})

test('calendar supports date selection, month navigation and focus restoration', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Открыть календарь' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Выберите день.' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: '20 октября 2026 г.', exact: true }),
  ).toBeFocused()
  await expect(
    dialog.getByRole('button', { name: '19 октября 2026 г.', exact: true }),
  ).toBeDisabled()
  await expect(
    dialog.getByRole('button', { name: 'Предыдущий месяц' }),
  ).toBeDisabled()
  await dialog.getByRole('button', { name: 'Следующий месяц' }).click()
  await expect(page.locator('#calendar-month')).toContainText('ноябрь 2026')
  await dialog
    .getByRole('button', { name: '20 ноября 2026 г.', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2026-11-20')
  await trigger.click()
  await expect(
    dialog.getByRole('button', { name: '20 ноября 2026 г.', exact: true }),
  ).toBeFocused()
  await dialog.getByRole('button', { name: 'Выбрать сегодня' }).click()
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2026-10-20')
})

test('calendar keyboard navigation, cancellation, focus trap and outside dismissal', async ({
  page,
}) => {
  await page.getByLabel('Желаемая дата').fill('2026-10-31')
  const trigger = page.getByRole('button', { name: 'Открыть календарь' })
  await trigger.click()
  await page.keyboard.press('PageDown')
  await expect(
    page.getByRole('button', { name: '30 ноября 2026 г.', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('button', { name: '1 декабря 2026 г.', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2026-10-31')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2026-11-01')
  await trigger.click()
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab')
    expect(
      await page
        .getByRole('dialog')
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true)
  }
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

for (const width of [360, 768, 1440]) {
  test(`open controls accessibility and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.getByRole('combobox', { name: 'Ваша программа' }).click()
    await expect(page.getByRole('option')).toHaveCount(3)
    const listBox = await page.getByRole('listbox').boundingBox()
    expect(listBox?.y).toBeGreaterThanOrEqual(0)
    expect((listBox?.y ?? 0) + (listBox?.height ?? 0)).toBeLessThanOrEqual(1000)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    if (width === 1440)
      await page
        .locator('.booking-panel')
        .screenshot({ path: 'test-results/screenshots/program-select.png' })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Открыть календарь' }).click()
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    const box = await page.getByRole('dialog').boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width)
    if (width === 1440)
      await page
        .getByRole('dialog')
        .screenshot({ path: 'test-results/screenshots/calendar.png' })
  })
}

test('touch device uses native picker and falls back if browser refuses it', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 812 },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    HTMLInputElement.prototype.showPicker = function () {
      this.dataset.pickerCalled = 'true'
    }
  })
  await page.goto('http://127.0.0.1:4173')
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  await expect(page.getByLabel('Желаемая дата')).toHaveAttribute(
    'data-picker-called',
    'true',
  )
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.evaluate(() => {
    HTMLInputElement.prototype.showPicker = () => {
      throw new DOMException('Not supported', 'NotAllowedError')
    }
  })
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await context.close()
})
