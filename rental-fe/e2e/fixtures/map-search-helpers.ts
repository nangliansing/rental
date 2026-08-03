import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test"

export function getMobileResultsPanel(page: Page) {
  return page.getByTestId("results-panel-mobile")
}

export async function clickMapControlButton(
  page: Page,
  name: string | RegExp,
  options?: { scope?: Locator },
) {
  const root = options?.scope ?? page

  await expect(async () => {
    const button = root.getByRole("button", { name })
    await expect(button).toBeVisible({ timeout: 5_000 })
    await expect(button).toBeEnabled({ timeout: 5_000 })
    await button.evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })
  }).toPass({ timeout: 30_000 })
}

async function waitForMapCanvas(page: Page) {
  const mapSurface = page.locator(".gm-style").first()
  const unavailable = page.getByText("Map temporarily unavailable")

  await expect(async () => {
    if (await unavailable.isVisible().catch(() => false)) {
      throw new Error("Google Maps failed to load.")
    }

    await expect(mapSurface).toBeVisible({ timeout: 10_000 })
    const box = await mapSurface.boundingBox()
    expect(box).toBeTruthy()
  }).toPass({ timeout: 45_000 })

  return mapSurface
}

export async function waitForAreaSearchResults(
  page: Page,
  buildingName: string,
) {
  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel).toBeVisible({ timeout: 30_000 })
  await expect(mobilePanel.getByText("1 building")).toBeVisible({
    timeout: 30_000,
  })
  await expect
    .poll(
      async () =>
        mobilePanel
          .getByRole("button", { name: new RegExp(buildingName) })
          .isVisible(),
      { timeout: 45_000 },
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
  const mapSurface = await waitForMapCanvas(page)
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
  const mapSurface = await waitForMapCanvas(page)
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
    await mapSurface.click({ position: point, force: true, timeout: 15_000 })
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
      { timeout: 45_000 },
    )
    .toBe(true)
}

/** @deprecated Use triggerAreaSearchStaleState */
export async function panMap(page: Page) {
  await triggerAreaSearchStaleState(page)
}

export async function activatePinOnIdleMap(page: Page, context: BrowserContext) {
  const dropPinButton = page.getByRole("button", { name: "Drop pin" })
  const removePinButton = page.getByRole("button", { name: "Remove pin" })

  await expect(dropPinButton).toBeVisible({ timeout: 15_000 })
  await dropPinButton.click({ force: true })

  const pinActivated = await removePinButton
    .isVisible({ timeout: 4_000 })
    .catch(() => false)

  if (!pinActivated) {
    await context.grantPermissions(["geolocation"])
    await context.setGeolocation({ latitude: 13.7563, longitude: 100.5018 })
    await page.getByRole("button", { name: "Use my location" }).click({ force: true })
  }

  await expect(removePinButton).toHaveAttribute("aria-pressed", "true", {
    timeout: 25_000,
  })
}

export async function commitNearbyPinSearch(
  page: Page,
  buildingName: string,
) {
  await clickMapControlButton(page, "Search within 1 km")

  const mobilePanel = getMobileResultsPanel(page)
  await expect(mobilePanel.getByText("1 building near pin")).toBeVisible({
    timeout: 30_000,
  })
  await expect(mobilePanel.getByText(buildingName)).toBeVisible({
    timeout: 15_000,
  })
  await expect(page).toHaveURL(/search=nearby/)
}

export async function openMapBuildingDetail(
  page: Page,
  buildingName: string,
) {
  const mobilePanel = getMobileResultsPanel(page)

  await expect(async () => {
    await expect(mobilePanel).toBeVisible({ timeout: 15_000 })
    const buildingButton = mobilePanel.getByRole("button", {
      name: new RegExp(buildingName),
    })
    await expect(buildingButton).toBeVisible({ timeout: 15_000 })
    await buildingButton.click({ force: true })
    await expect(
      mobilePanel.getByRole("heading", {
        name: `${buildingName} details`,
      }),
    ).toBeVisible({ timeout: 15_000 })
  }).toPass({ timeout: 60_000 })

  return mobilePanel
}
