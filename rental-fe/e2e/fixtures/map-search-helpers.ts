import { expect, type Page } from "@playwright/test"

export function getMapSurface(page: Page) {
  return page.locator(".gm-style").first()
}

export function getMobileResultsPanel(page: Page) {
  return page.getByTestId("results-panel-mobile")
}

export async function waitForAreaSearchResults(
  page: Page,
  buildingName: string,
) {
  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel).toBeVisible({ timeout: 20_000 })
  await expect(mobilePanel.getByText("1 building")).toBeVisible({
    timeout: 20_000,
  })
  await expect(
    mobilePanel.getByRole("button", { name: new RegExp(buildingName) }),
  ).toBeVisible({
    timeout: 20_000,
  })
}

export async function waitForAreaSearchError(page: Page) {
  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel).toBeVisible({ timeout: 20_000 })
  await expect(mobilePanel.getByRole("alert")).toContainText(
    "Could not search this area",
    { timeout: 20_000 },
  )
}

export async function collapseMobileResultsPanel(page: Page) {
  const mobilePanel = getMobileResultsPanel(page)
  if (!(await mobilePanel.isVisible().catch(() => false))) {
    return
  }

  const handle = mobilePanel.locator(".cursor-grab").first()
  const box = await handle.boundingBox()
  if (!box) {
    return
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX, startY + 180, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}

function getMapInteractionPoint(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error("Viewport size unavailable")
  }

  return {
    x: viewport.width / 2,
    y: Math.round(viewport.height * 0.2),
  }
}

export async function moveMapToStale(page: Page) {
  await expect(getMapSurface(page)).toBeVisible({ timeout: 20_000 })
  await collapseMobileResultsPanel(page)

  const { x, y } = getMapInteractionPoint(page)

  await page.mouse.move(x, y)
  await page.mouse.wheel(0, -400)
  await page.waitForTimeout(750)

  const searchButton = page.getByRole("button", { name: "Search this area" })
  if (await searchButton.isVisible().catch(() => false)) {
    return
  }

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 140, y - 90, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(750)
}

export async function clickMapAt(
  page: Page,
  offset = { x: 0, y: 0 },
) {
  await expect(getMapSurface(page)).toBeVisible({ timeout: 20_000 })

  const { x, y } = getMapInteractionPoint(page)

  await page.mouse.click(x + offset.x, y + offset.y)
}
