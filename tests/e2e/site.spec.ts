import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { localDate, STORAGE_KEY } from '../../src/booking'

const today = () => localDate()
const choose = (page: Page, name = 'Глубокий отдых') =>
  page.getByRole('button', { name: `Выбрать программу «${name}»` }).click()
const selectProgram = async (page: Page, name: string) => {
  await page.getByRole('combobox', { name: 'Ваша программа' }).click()
  await page.getByRole('option', { name: new RegExp(name) }).click()
}
const fill = async (page: Page, date = today()) => {
  await page.getByLabel('Как к вам обращаться').fill('Анна-Мария Lee')
  await page.getByLabel('Желаемая дата').fill(date)
}
const submit = (page: Page) =>
  page.getByRole('button', { name: 'Сохранить демо-заявку' }).click()

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('full flow, program replacement, double submission, restore, edit and delete', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await choose(page, 'Перезагрузка')
  await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toContainText('Перезагрузка')
  await choose(page)
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toContainText('Глубокий отдых')
  await fill(page)
  await page
    .getByRole('button', { name: 'Сохранить демо-заявку' })
    .evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
    })
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toBeVisible()
  await expect(page.locator('.confirmation')).toBeFocused()
  await expect(page.locator('.confirmation')).toContainText('Анна-Мария Lee')
  await expect(page.locator('.confirmation')).toContainText('Глубокий отдых')
  const stored = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>,
    STORAGE_KEY,
  )
  expect(Object.keys(stored).sort()).toEqual([
    'date',
    'name',
    'programId',
    'version',
  ])
  await page.reload()
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toBeAttached()
  await page.getByRole('button', { name: 'Изменить заявку' }).click()
  await expect(page.getByLabel('Как к вам обращаться')).toHaveValue(
    'Анна-Мария Lee',
  )
  await selectProgram(page, 'Для двоих')
  await submit(page)
  await expect(page.locator('.confirmation')).toContainText('Для двоих')
  await page.getByRole('button', { name: 'Удалить из браузера' }).click()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBeNull()
  await page.reload()
  await expect(page.getByLabel('Как к вам обращаться')).toHaveValue('')
  expect(errors).toEqual([])
})

test('required fields, whitespace name, past date and corrections', async ({
  page,
}) => {
  await submit(page)
  await expect(page.locator('.field-error')).toHaveCount(3)
  await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
  await page.getByLabel('Как к вам обращаться').fill('   ')
  await submit(page)
  await expect(page.locator('#name-error')).toBeVisible()
  await page.getByLabel('Как к вам обращаться').fill('Li 王')
  await expect(page.locator('#name-error')).toHaveCount(0)
  await selectProgram(page, 'Перезагрузка')
  await page.getByLabel('Желаемая дата').fill('2020-01-01')
  await submit(page)
  await expect(page.locator('#date-error')).toContainText('уже прошла')
  await expect(page.getByLabel('Желаемая дата')).toBeFocused()
  await page.getByLabel('Желаемая дата').fill(today())
  await expect(page.locator('#date-error')).toHaveCount(0)
  await submit(page)
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toBeVisible()
})

test('future date, safe user content and card choice after saved request', async ({
  page,
}) => {
  await choose(page, 'Для двоих')
  await fill(page, '2099-12-31')
  const payload = '<img src=x onerror=alert(1)>'
  await page.getByLabel('Как к вам обращаться').fill(payload)
  await submit(page)
  await expect(page.locator('.confirmation')).toContainText(payload)
  await expect(page.locator('.confirmation img')).toHaveCount(0)
  await choose(page, 'Перезагрузка')
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toContainText('Перезагрузка')
  await expect(page.getByLabel('Как к вам обращаться')).toHaveValue(payload)
})

test('damaged localStorage does not break page and can be replaced', async ({
  page,
}) => {
  await page.evaluate(
    (key) => localStorage.setItem(key, '{broken'),
    STORAGE_KEY,
  )
  await page.reload()
  await expect(
    page.getByText('Предыдущую заявку не удалось прочитать.', { exact: false }),
  ).toBeVisible()
  await choose(page)
  await fill(page)
  await submit(page)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toBeAttached()
})

test('inaccessible localStorage never claims success and preserves form', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
  })
  await page.reload()
  await choose(page)
  await fill(page)
  await submit(page)
  await expect(
    page.getByText('Не удалось сохранить заявку в браузере.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Как к вам обращаться')).toHaveValue(
    'Анна-Мария Lee',
  )
})

test('write quota and delete failure are reported without losing saved data', async ({
  page,
}) => {
  await choose(page)
  await fill(page)
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await submit(page)
  await expect(
    page.getByText('Не удалось сохранить заявку в браузере.', { exact: false }),
  ).toBeVisible()
  await page.reload()
  await choose(page)
  await fill(page)
  await submit(page)
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new Error('blocked')
    }
  })
  await page.getByRole('button', { name: 'Удалить из браузера' }).click()
  await expect(
    page.getByText('Не удалось удалить заявку:', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Заявка сохранена/ }),
  ).toBeVisible()
})

test('keyboard navigation and submission with skip link', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Перейти к содержимому' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  for (let i = 0; i < 12; i++) {
    if (
      await page
        .getByRole('button', { name: 'Выбрать программу «Перезагрузка»' })
        .evaluate((el) => el === document.activeElement)
    )
      break
    await page.keyboard.press('Tab')
  }
  await expect(
    page.getByRole('button', { name: 'Выбрать программу «Перезагрузка»' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
  await page.keyboard.type('Sasha')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Желаемая дата')).toBeFocused()
  // Native date keyboard segments differ by OS; set a value, then submit by keyboard.
  await page.getByLabel('Желаемая дата').fill(today())
  await page.keyboard.press('Tab')
  for (let i = 0; i < 5; i++) {
    if (
      await page
        .getByRole('button', { name: 'Сохранить демо-заявку' })
        .evaluate((el) => el === document.activeElement)
    )
      break
    await page.keyboard.press('Tab')
  }
  await expect(
    page.getByRole('button', { name: 'Сохранить демо-заявку' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.confirmation')).toBeFocused()
})

for (const width of [360, 375, 768, 1024, 1440]) {
  test(`layout and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.locator('.hero-visual img')).toBeVisible()
    expect(
      await page
        .locator('.hero-visual img')
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await page.screenshot({
      path: `test-results/screenshots/page-${width}.png`,
      fullPage: true,
    })
    if (width === 1440)
      await page.screenshot({
        path: 'test-results/screenshots/desktop-hero.png',
      })
    await submit(page)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    if (width === 360)
      await page.locator('.booking-section').screenshot({
        path: 'test-results/screenshots/mobile-errors.png',
      })
    await choose(page)
    await fill(page)
    await submit(page)
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}

for (const [timezoneId, time, expected] of [
  ['Pacific/Kiritimati', '2026-10-20T11:30:00Z', '2026-10-21'],
  ['America/Adak', '2026-10-20T01:30:00Z', '2026-10-19'],
] as const) {
  test(`local today across UTC boundary: ${timezoneId}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId })
    const page = await context.newPage()
    await page.clock.install({ time: new Date(time) })
    await page.goto('http://127.0.0.1:4173')
    await expect(page.getByLabel('Желаемая дата')).toHaveAttribute(
      'min',
      expected,
    )
    await choose(page)
    await fill(page, expected)
    await submit(page)
    await expect(
      page.getByRole('heading', { name: /Заявка сохранена/ }),
    ).toBeVisible()
    await context.close()
  })
}

test('midnight refresh rejects yesterday even when a form was left open', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T20:59:00Z') })
  await page.reload()
  await choose(page)
  await fill(page, '2026-10-20')
  await page.clock.fastForward(120_000)
  await expect(page.getByLabel('Желаемая дата')).toHaveAttribute(
    'min',
    '2026-10-21',
  )
  await submit(page)
  await expect(page.locator('#date-error')).toContainText('уже прошла')
})

test('reflows at 320 CSS pixels and respects reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(
    await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).scrollBehavior),
  ).toBe('auto')
  await choose(page, 'Для двоих')
  await fill(page)
  await submit(page)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
