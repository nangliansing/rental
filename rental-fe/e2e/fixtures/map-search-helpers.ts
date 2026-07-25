import { expect, type Page } from "@playwright/test"

export function getMapSurface(page: Page) {
  return page.locator(".gm-style").first()
}

export async function panMap(
  page: Page,
  delta = { x: -140, y: -90 },
) {
  const map = getMapSurface(page)
  await expect(map).toBeVisible({ timeout: 20_000 })

  const box = await map.boundingBox()
  if (!box) {
    throw new Error("Map bounding box unavailable")
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + delta.x, startY + delta.y, { steps: 16 })
  await page.mouse.up()
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

  await page.mouse.click(
    box.x + box.width / 2 + offset.x,
    box.y + box.height / 2 + offset.y,
  )
}

export function getMobileResultsPanel(page: Page) {
  return page.getByTestId("results-panel-mobile")
}
