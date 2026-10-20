import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { formatDate, STORAGE_KEY } from '../../src/booking'

test('audit: all calendar navigation keys and native button Space', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T09:00:00Z') })
  await page.goto('/#booking')
  await page.getByLabel('Желаемая дата').fill('2028-06-15')
  const trigger = page.getByRole('button', { name: 'Открыть календарь' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  for (const [key, date] of [
    ['ArrowUp', '2028-06-08'],
    ['ArrowDown', '2028-06-15'],
    ['ArrowLeft', '2028-06-14'],
    ['ArrowRight', '2028-06-15'],
    ['Home', '2028-06-12'],
    ['End', '2028-06-18'],
    ['PageUp', '2028-05-18'],
    ['PageDown', '2028-06-18'],
    ['Shift+PageUp', '2027-06-18'],
    ['Shift+PageDown', '2028-06-18'],
  ]) {
    if (!key || !date) throw new Error('Invalid keyboard fixture')
    await page.keyboard.press(key)
    await expect(
      page.getByRole('button', { name: formatDate(date), exact: true }),
    ).toBeFocused()
  }
  await page.keyboard.press('Space')
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2028-06-18')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Закрыть календарь' }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('audit: combobox ArrowUp, edge bounds, Alt+Up and reverse Tab', async ({
  page,
}) => {
  await page.goto('/#booking')
  const select = page.getByRole('combobox', { name: 'Ваша программа' })
  await select.focus()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(select).toContainText('Для двоих')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    'program-option-1',
  )
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowUp')
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    'program-option-0',
  )
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowDown')
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    'program-option-2',
  )
  await page.keyboard.press('Alt+ArrowUp')
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+Tab')
  await expect(select).toContainText('Перезагрузка')
  await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
})

test('audit: Space opens and commits the combobox without submitting the form', async ({
  page,
}) => {
  await page.goto('/#booking')
  const select = page.getByRole('combobox', { name: 'Ваша программа' })
  await select.focus()
  await page.keyboard.press('Space')
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  await expect(select).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('option', { name: /Глубокий отдых/ }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Space')
  await expect(select).toContainText('Глубокий отдых')
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.field-error')).toHaveCount(0)
  await expect(page.locator('.confirmation')).toHaveCount(0)
})

test('audit: an open list fits after viewport resize', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/#booking')
  const select = page.getByRole('combobox', { name: 'Ваша программа' })
  await select.click()
  await page.setViewportSize({ width: 360, height: 500 })
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await select.click()
  const list = page.getByRole('listbox')
  // Repositioning or dismissing on resize are both valid; never leave an inaccessible open list.
  if (await list.isVisible()) {
    const box = await list.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect(box?.y).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(500)
  }
  await page.keyboard.press('Escape')
  await expect(select).toHaveAttribute('aria-expanded', 'false')
})

test('audit: an open calendar keeps an enabled active day across midnight', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T20:59:00Z') })
  await page.goto('/#booking')
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  await expect(
    page.getByRole('button', { name: '20 октября 2026 г.', exact: true }),
  ).toBeFocused()
  await page.clock.fastForward(120_000)
  await expect(
    page.getByRole('button', { name: '20 октября 2026 г.', exact: true }),
  ).toBeDisabled()
  await expect(
    page.locator('.calendar-day[tabindex="0"]:not(:disabled)'),
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: '21 октября 2026 г.', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('2026-10-21')
})

test('audit: the maximum allowed date does not wrap back to today', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T09:00:00Z') })
  await page.goto('/#booking')
  await page.getByLabel('Желаемая дата').fill('9999-12-31')
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  const last = page.getByRole('button', {
    name: '31 декабря 9999 г.',
    exact: true,
  })
  await expect(last).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(last).toBeFocused()
  await page.keyboard.press('PageDown')
  await expect(last).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Желаемая дата')).toHaveValue('9999-12-31')
})

for (const [date, keys, expected] of [
  ['2026-12-31', ['ArrowRight'], '2027-01-01'],
  ['2028-02-28', ['ArrowRight', 'ArrowRight'], '2028-03-01'],
  ['2028-01-31', ['PageDown'], '2028-02-29'],
] as const) {
  test(`audit: calendar boundary ${date} to ${expected}`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-20T09:00:00Z') })
    await page.goto('/#booking')
    await page.getByLabel('Желаемая дата').fill(date)
    await page.getByRole('button', { name: 'Открыть календарь' }).click()
    for (const key of keys) await page.keyboard.press(key)
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Желаемая дата')).toHaveValue(expected)
  })
}

test('audit: touch selection, outside dismissal and mobile calendar fallback', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/#booking')
  const select = page.getByRole('combobox', { name: 'Ваша программа' })
  await select.tap()
  await page.getByRole('option', { name: /Для двоих/ }).tap()
  await expect(select).toContainText('Для двоих')
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await select.tap()
  await page.getByRole('heading', { name: 'Оставьте время для себя.' }).tap()
  await expect(select).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => {
    HTMLInputElement.prototype.showPicker = () => {
      throw new DOMException('unsupported', 'NotSupportedError')
    }
  })
  await page.getByRole('button', { name: 'Открыть календарь' }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Выбрать сегодня' }).tap()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await context.close()
})

test('audit: labels, required/invalid state, descriptions and accessibility snapshots', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-20T09:00:00Z') })
  await page.goto('/#booking')
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toHaveAttribute('aria-required', 'true')
  await page.getByRole('button', { name: 'Сохранить демо-заявку' }).click()
  await expect(
    page.getByLabel('Как к вам обращаться'),
  ).toHaveAccessibleDescription('Введите имя — достаточно одного слова.')
  await expect(
    page.getByRole('combobox', { name: 'Ваша программа' }),
  ).toHaveAccessibleDescription('Выберите одну из трёх программ.')
  await expect(page.getByLabel('Желаемая дата')).toHaveAccessibleDescription(
    /Сегодня.*Выберите желаемую дату/,
  )
  await testInfo.attach('errors-accessibility-tree', {
    body: await page.locator('#booking').ariaSnapshot(),
    contentType: 'text/plain',
  })
  await page.getByRole('combobox', { name: 'Ваша программа' }).click()
  await expect(
    page.getByRole('listbox', { name: 'Ваша программа' }),
  ).toBeVisible()
  await testInfo.attach('list-accessibility-tree', {
    body: await page.locator('#booking').ariaSnapshot(),
    contentType: 'text/plain',
  })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Выберите день.')
  await expect(page.getByRole('grid')).toHaveAccessibleName(/2026/)
  await testInfo.attach('calendar-accessibility-tree', {
    body: await page.getByRole('dialog').ariaSnapshot(),
    contentType: 'text/plain',
  })
})

test('audit: visible logo label matches its accessible name and robots is plain text', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.brand')).toHaveAccessibleName(
    'Место SPA — на главную',
  )
  expect(
    (
      await new AxeBuilder({ page })
        .withRules(['label-content-name-mismatch'])
        .analyze()
    ).violations,
  ).toEqual([])
  const robots = await page.request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(robots.headers()['content-type']).toContain('text/plain')
  expect(await robots.text()).toBe('User-agent: *\nAllow: /\n')
})

test('audit: invalid stored structures are recoverable; old valid requests remain visible', async ({
  page,
}) => {
  await page.goto('/')
  const good = {
    version: 1,
    name: 'Тестовый гость',
    programId: 'reset',
    date: '2099-12-31',
  }
  for (const data of [
    null,
    { ...good, version: 2 },
    { ...good, name: {} },
    { ...good, date: '2027-04-31' },
    { ...good, programId: 'evil' },
  ]) {
    await page.evaluate(
      ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
      { key: STORAGE_KEY, data },
    )
    await page.reload()
    await expect(
      page.getByText('Предыдущую заявку не удалось прочитать.', {
        exact: false,
      }),
    ).toBeAttached()
    await expect(page.getByLabel('Как к вам обращаться')).toHaveValue('')
  }
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    {
      key: STORAGE_KEY,
      data: {
        ...good,
        date: '2020-01-01',
        unexpected: '<script>alert(1)</script>',
      },
    },
  )
  await page.reload()
  await expect(page.locator('.confirmation')).toContainText('1 января 2020')
  await expect(page.locator('.confirmation')).not.toContainText('<script>')
  await page.getByRole('button', { name: 'Изменить заявку' }).click()
  await page.getByRole('button', { name: 'Сохранить демо-заявку' }).click()
  await expect(page.locator('#date-error')).toContainText('уже прошла')
})

for (const width of [360, 1440]) {
  test(`audit: no console errors or third-party requests at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    const requests: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('requestfailed', (request) =>
      errors.push(`${request.method()} ${request.url()}`),
    )
    page.on('request', (request) => requests.push(request.url()))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Выбрать программу «Для двоих»' })
      .click()
    await expect(page.getByLabel('Как к вам обращаться')).toBeFocused()
    await page.getByLabel('Как к вам обращаться').fill('<svg onload=alert(1)>')
    await page.getByRole('button', { name: 'Открыть календарь' }).click()
    await page.getByRole('button', { name: 'Выбрать сегодня' }).click()
    await page.getByRole('button', { name: 'Сохранить демо-заявку' }).click()
    await expect(page.locator('.confirmation')).toContainText(
      '<svg onload=alert(1)>',
    )
    await expect(page.locator('.confirmation svg[onload]')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.confirmation')).toBeAttached()
    if (width === 1440)
      await page
        .locator('#booking')
        .screenshot({ path: 'test-results/screenshots/audit-confirmation.png' })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(errors).toEqual([])
    expect(
      requests.filter((url) => !url.startsWith('http://127.0.0.1:4173/')),
    ).toEqual([])
    await testInfo.attach('network-and-console', {
      body: JSON.stringify({ errors, requests }, null, 2),
      contentType: 'application/json',
    })
  })
}
