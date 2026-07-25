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

function getMobileMapInteractionPoint(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error("Viewport size unavailable")
  }

  return {
    x: viewport.width / 2,
    y: Math.round(viewport.height * 0.2),
  }
}

export async function clickMapAt(
  page: Page,
  offset = { x: 0, y: 0 },
) {
  await expect(getMapSurface(page)).toBeVisible({ timeout: 20_000 })

  const { x, y } = getMobileMapInteractionPoint(page)
  await page.mouse.click(x + offset.x, y + offset.y)
}
