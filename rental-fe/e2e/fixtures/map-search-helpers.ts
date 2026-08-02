import { expect, type Page } from "@playwright/test"

export function getMobileResultsPanel(page: Page) {
  return page.getByTestId("results-panel-mobile")
}

export async function waitForAreaSearchResults(
  page: Page,
  buildingName: string,
) {
  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel).toBeVisible({ timeout: 60_000 })
  await expect(mobilePanel.getByText("1 building")).toBeVisible({
    timeout: 60_000,
  })
  await expect
    .poll(
      async () =>
        mobilePanel
          .getByRole("button", { name: new RegExp(buildingName) })
          .isVisible(),
      { timeout: 60_000 },
    )
    .toBe(true)
}

export async function waitForAreaSearchError(page: Page) {
  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel).toBeVisible({ timeout: 20_000 })
  await expect(mobilePanel.getByText("Search failed")).toBeVisible({
    timeout: 20_000,
  })
  await expect(mobilePanel.getByRole("alert")).toContainText(
    "Could not search this area",
    { timeout: 20_000 },
  )
}

export async function triggerAreaSearchStaleState(page: Page) {
  const mapSurface = page.locator(".gm-style").first()
  await mapSurface.waitFor({ state: "visible", timeout: 20_000 })
  const box = await mapSurface.boundingBox()
  if (!box) {
    throw new Error("Map surface bounding box unavailable for map interaction.")
  }

  const fromX = box.x + box.width * 0.6
  const fromY = box.y + box.height * 0.3
  const toX = box.x + box.width * 0.25
  const toY = box.y + box.height * 0.15

  await page.mouse.move(fromX, fromY)
  await page.mouse.down()
  await page.mouse.move(toX, toY, { steps: 18 })
  await page.mouse.up()

  await page.mouse.move(fromX, fromY)
  await page.mouse.wheel(0, -400)
}

export async function drawLineOnMap(page: Page, pointCount = 2) {
  const mapSurface = page.locator(".gm-style").first()
  await mapSurface.waitFor({ state: "visible", timeout: 20_000 })
  const box = await mapSurface.boundingBox()
  if (!box) {
    throw new Error("Map surface unavailable for line drawing.")
  }

  const tapPoints = [
    { x: box.width * 0.35, y: box.height * 0.58 },
    { x: box.width * 0.68, y: box.height * 0.66 },
    { x: box.width * 0.52, y: box.height * 0.74 },
  ]

  for (const point of tapPoints.slice(0, Math.max(pointCount, 2))) {
    await mapSurface.click({ position: point, force: true })
    await page.waitForTimeout(350)
  }

  await expect
    .poll(async () => {
      return page
        .getByRole("button", { name: /Search within .* of line/ })
        .isEnabled()
    }, { timeout: 25_000 })
    .toBe(true)
}

export async function waitForSearchThisArea(page: Page) {
  await expect
    .poll(
      async () =>
        page.getByRole("button", { name: "Search this area" }).isVisible(),
      { timeout: 60_000 },
    )
    .toBe(true)
}

/** @deprecated Use triggerAreaSearchStaleState */
export async function panMap(page: Page) {
  await triggerAreaSearchStaleState(page)
}
