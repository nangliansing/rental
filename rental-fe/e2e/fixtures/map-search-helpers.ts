import { expect, type Page } from "@playwright/test"

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

export function getMapSurface(page: Page) {
  return page.locator(".gm-style").first()
}

export function getMobileResultsPanel(page: Page) {
  return page.getByTestId("results-panel-mobile")
}

export function getDesktopResultsPanel(page: Page) {
  return page.getByTestId("results-panel-desktop")
}

export function isDesktopViewport(page: Page) {
  const viewport = page.viewportSize()
  return Boolean(viewport && viewport.width >= 1024)
}

export function getActiveResultsPanel(page: Page) {
  return isDesktopViewport(page)
    ? getDesktopResultsPanel(page)
    : getMobileResultsPanel(page)
}

export async function waitForAreaSearchResults(
  page: Page,
  buildingName: string,
) {
  const resultsPanel = getActiveResultsPanel(page)
  await expect(resultsPanel).toBeVisible({ timeout: 20_000 })
  await expect(resultsPanel.getByText("1 building")).toBeVisible({
    timeout: 20_000,
  })
  await expect(
    resultsPanel.getByRole("button", { name: new RegExp(buildingName) }),
  ).toBeVisible({
    timeout: 20_000,
  })
}

export async function waitForAreaSearchError(page: Page) {
  const resultsPanel = getActiveResultsPanel(page)
  await expect(resultsPanel).toBeVisible({ timeout: 20_000 })
  await expect(resultsPanel.getByRole("alert")).toContainText(
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

async function moveDesktopMapToStale(page: Page) {
  const map = getMapSurface(page)
  await expect(map).toBeVisible({ timeout: 20_000 })

  const box = await map.boundingBox()
  if (!box) {
    throw new Error("Map bounding box unavailable")
  }

  const x = box.x + box.width * 0.35
  const y = box.y + box.height / 2

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

async function moveMobileMapToStale(page: Page) {
  await collapseMobileResultsPanel(page)

  const { x, y } = getMobileMapInteractionPoint(page)

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

export async function moveMapToStale(page: Page) {
  if (isDesktopViewport(page)) {
    await moveDesktopMapToStale(page)
    return
  }

  await moveMobileMapToStale(page)
}

export async function clickMapAt(
  page: Page,
  offset = { x: 0, y: 0 },
) {
  await expect(getMapSurface(page)).toBeVisible({ timeout: 20_000 })

  if (isDesktopViewport(page)) {
    const map = getMapSurface(page)
    const box = await map.boundingBox()
    if (!box) {
      throw new Error("Map bounding box unavailable")
    }

    await page.mouse.click(
      box.x + box.width * 0.35 + offset.x,
      box.y + box.height / 2 + offset.y,
    )
    return
  }

  const { x, y } = getMobileMapInteractionPoint(page)
  await page.mouse.click(x + offset.x, y + offset.y)
}

export { DESKTOP_VIEWPORT }
