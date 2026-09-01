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

  const overlay = page.getByTestId('tunneled-overlay')
  await expect(overlay).toBeVisible()
  await overlay.click()
  await expect(page.getByTestId('overlay-click-count')).toHaveText('1')
  await expect(overlay).toContainText('1')

  const toggle = page.getByTestId('toggle-mesh')
  for (let index = 0; index < 3; index += 1) {
    await toggle.click()
    await expect(page.getByTestId('scene-mesh-count')).toHaveText('0')
    await toggle.click()
    await expect(page.getByTestId('scene-mesh-count')).toHaveText('1')
  }

  expect(problems).toEqual([])
})
