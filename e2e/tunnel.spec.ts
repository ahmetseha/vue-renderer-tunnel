import { expect, test } from '@playwright/test'

test('routes real content in both directions through Tres', async ({ page }) => {
  const problems: string[] = []
  page.on('console', message => {
    // SwiftShader emits Chromium driver diagnostics in headless WebGL. They are
    // browser-level performance notices, not application/Vue/Tres warnings.
    if (message.text().includes('GL Driver Message')) return
    if (message.type() === 'warning' || message.type() === 'error') {
      problems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))

  await page.goto('/')
  await expect(page.getByTestId('tres-canvas')).toBeVisible()
  await expect(page.getByTestId('canvas-ready')).toHaveText('true')
  await expect(page.getByTestId('scene-mesh-count')).toHaveText('1')
  const actualColor = page.getByTestId('actual-material-color')
  const actualRotation = page.getByTestId('actual-rotation-y')
  await expect(actualColor).toHaveText('#f97316')
  await expectRotationY(0)

  await page.getByTestId('color-input').fill('#22c55e')
  await expect(actualColor).toHaveText('#22c55e')

  const overlay = page.getByTestId('tunneled-overlay')
  await expect(overlay).toBeVisible()
  await overlay.click()
  await expect(page.getByTestId('overlay-click-count')).toHaveText('1')
  await expect(overlay).toContainText('1')
  await expectRotationY(0.25)
  await overlay.click()
  await expect(page.getByTestId('overlay-click-count')).toHaveText('2')
  await expectRotationY(0.5)

  const toggle = page.getByTestId('toggle-mesh')
  for (let index = 0; index < 3; index += 1) {
    await toggle.click()
    await expect(page.getByTestId('scene-mesh-count')).toHaveText('0')
    await expect(actualColor).toHaveText('unmounted')
    await expect(actualRotation).toHaveText('unmounted')
    await toggle.click()
    await expect(page.getByTestId('scene-mesh-count')).toHaveText('1')
    await expect(actualColor).toHaveText('#22c55e')
    await expectRotationY(0.5)
  }

  expect(problems).toEqual([])

  async function expectRotationY(expected: number): Promise<void> {
    await expect.poll(async () => Number(await actualRotation.textContent()))
      .toBeCloseTo(expected, 3)
  }
})
