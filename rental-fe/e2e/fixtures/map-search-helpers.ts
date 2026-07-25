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
  await expect(mobilePanel.getByText(buildingName)).toBeVisible({
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

export async function moveMapToStale(page: Page) {
  const map = getMapSurface(page)
  await expect(map).toBeVisible({ timeout: 20_000 })

  const box = await map.boundingBox()
  if (!box) {
    throw new Error("Map bounding box unavailable")
  }

  await map.hover({
    position: { x: box.width / 2, y: box.height / 2 },
  })
  await page.mouse.wheel(0, -400)
  await page.waitForTimeout(750)

  const searchButton = page.getByRole("button", { name: "Search this area" })
  if (await searchButton.isVisible().catch(() => false)) {
    return
  }

  await map.dragTo(map, {
    sourcePosition: { x: box.width / 2, y: box.height / 2 },
    targetPosition: { x: box.width / 2 - 140, y: box.height / 2 - 90 },
  })
  await page.waitForTimeout(750)
}

export async function clickMapAt(
  page: Page,
  offset = { x: 0, y: 0 },
) {
  const map = getMapSurface(page)
  await expect(map).toBeVisible({ timeout: 20_000 })

  const box = await map.boundingBox()
  if (!box) {
    throw new Error("Map bounding box unavailable")
  }

  await map.click({
    position: {
      x: box.width / 2 + offset.x,
      y: box.height / 2 + offset.y,
    },
    force: true,
  })
}
