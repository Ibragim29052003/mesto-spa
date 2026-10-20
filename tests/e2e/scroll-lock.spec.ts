import { test, expect } from '@playwright/test'

const closeMethods = ['button', 'escape', 'backdrop', 'selection'] as const

for (const method of closeMethods) {
  test(`calendar freezes background and restores scrolling after ${method}`, async ({
    page,
  }) => {
    await page.goto('/#booking')
    const trigger = page.getByRole('button', { name: 'Открыть календарь' })
    await trigger.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => ({
      scrollY: window.scrollY,
      bodyStyle: document.body.getAttribute('style'),
      rootStyle: document.documentElement.getAttribute('style'),
      left: document.querySelector('#booking-title')!.getBoundingClientRect()
        .left,
      top: document.querySelector('#booking-title')!.getBoundingClientRect()
        .top,
    }))
    expect(before.scrollY).toBeGreaterThan(0)
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('body')).toHaveCSS('position', 'fixed')
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')

    const background = () =>
      page.locator('#booking-title').evaluate((heading) => ({
        top: heading.getBoundingClientRect().top,
        left: heading.getBoundingClientRect().left,
      }))
    await expect
      .poll(background)
      .toEqual({ top: before.top, left: before.left })
    await page.mouse.move(5, 300)
    await page.mouse.wheel(0, 700)
    // Two frames allow the browser to process wheel scrolling before checking geometry.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    expect(await background()).toEqual({ top: before.top, left: before.left })

    if (method === 'button')
      await page.getByRole('button', { name: 'Закрыть календарь' }).click()
    if (method === 'escape') await page.keyboard.press('Escape')
    if (method === 'backdrop') await page.mouse.click(5, 5)
    if (method === 'selection')
      await page.getByRole('button', { name: 'Выбрать сегодня' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(before.scrollY)
    expect(
      await page.evaluate(() => document.body.getAttribute('style') ?? ''),
    ).toBe(before.bodyStyle ?? '')
    expect(
      await page.evaluate(
        () => document.documentElement.getAttribute('style') ?? '',
      ),
    ).toBe(before.rootStyle ?? '')
    await expect(trigger).toBeFocused()
    await page.mouse.move(5, 300)
    await page.mouse.wheel(0, -500)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(before.scrollY)
    if (method === 'button') {
      await trigger.click()
      await expect(page.locator('body')).toHaveCSS('position', 'fixed')
      await page.screenshot({
        path: 'test-results/screenshots/calendar-scroll-lock.png',
      })
    }
  })
}

test('calendar can scroll internally in a short viewport without moving the background', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 400 })
  await page.goto('/#booking')
  await page.getByRole('button', { name: 'Открыть календарь' }).click()
  const dialog = page.getByRole('dialog')
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  const bodyTop = await page
    .locator('body')
    .evaluate((body) => body.getBoundingClientRect().top)
  const box = await dialog.boundingBox()
  if (!box) throw new Error('Calendar is not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 400)
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  expect(
    await page
      .locator('body')
      .evaluate((body) => body.getBoundingClientRect().top),
  ).toBe(bodyTop)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
})
