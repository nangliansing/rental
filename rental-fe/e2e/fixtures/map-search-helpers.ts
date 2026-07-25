import { expect, type Page } from "@playwright/test"

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
  await expect(mobilePanel.getByText("Search failed")).toBeVisible({
    timeout: 20_000,
  })
  await expect(mobilePanel.getByRole("alert")).toContainText(
    "Could not search this area",
    { timeout: 20_000 },
  )
}
