import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import {
  areaSearchUrl,
  nearbySearchUrl,
  smokeAreaBuilding,
  smokeLineBuilding,
  smokeNearbyBuilding,
  smokePannedAreaBuilding,
} from "./fixtures/map-search-buildings"
import {
  clickMapAt,
  getMobileResultsPanel,
  panMap,
} from "./fixtures/map-search-helpers"
import {
  installMapSearchApiMocks,
  waitForMapReady,
} from "./fixtures/map-search-routes"

const env = loadEnv("development", process.cwd(), "")
const hasMapsKey = Boolean(
  (process.env.VITE_GOOGLE_MAPS_API_KEY ?? env.VITE_GOOGLE_MAPS_API_KEY)?.trim(),
)

test.describe("Map search smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasMapsKey,
      "Set VITE_GOOGLE_MAPS_API_KEY in .env to run browser smoke tests.",
    )
  })

  test("hydrates an area search with a real map and results panel", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel).toBeVisible()
    await expect(mobilePanel.getByText("1 building")).toBeVisible()
    await expect(
      mobilePanel.getByText(smokeAreaBuilding.name),
    ).toBeVisible()
    await expect(page).toHaveURL(/search=area/)
  })

  test("hydrates a nearby search from the URL", async ({ page }) => {
    await installMapSearchApiMocks(page)
    await page.goto(nearbySearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel).toBeVisible()
    await expect(
      mobilePanel.getByText(smokeNearbyBuilding.name),
    ).toBeVisible()
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("opens building detail and returns to the results list", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel
      .getByRole("button", { name: new RegExp(smokeAreaBuilding.name) })
      .click()

    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible()

    await mobilePanel.getByRole("button", { name: "Go back" }).click()

    await expect(mobilePanel.getByText("1 building")).toBeVisible()
    await expect(
      mobilePanel.getByRole("button", {
        name: new RegExp(smokeAreaBuilding.name),
      }),
    ).toBeVisible()
  })

  test("commits a new area search after panning the map", async ({ page }) => {
    await installMapSearchApiMocks(page, { pannedAreaOnSecondSearch: true })
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText(smokeAreaBuilding.name)).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Search this area" }),
    ).toHaveCount(0)

    await panMap(page)

    const searchButton = page.getByRole("button", { name: "Search this area" })
    await expect(searchButton).toBeVisible()
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    await expect(mobilePanel.getByText(smokePannedAreaBuilding.name)).toBeVisible(
      { timeout: 15_000 },
    )
    await expect(page).toHaveURL(/search=area/)
    await expect(page).toHaveURL(/neLat=/)
  })

  test("drops a pin and commits a nearby search from the idle map", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto("/")

    await waitForMapReady(page)
    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Drop pin" }).click()
    await expect(page.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    const searchButton = page.getByRole("button", {
      name: "Search within 1 km",
    })
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building near pin")).toBeVisible({
      timeout: 15_000,
    })
    await expect(mobilePanel.getByText(smokeNearbyBuilding.name)).toBeVisible()
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("draws a line and commits a line search from the idle map", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto("/")

    await waitForMapReady(page)

    await page.getByRole("button", { name: "Draw search line" }).click()
    await expect(
      page.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")

    await clickMapAt(page, { x: -70, y: -40 })
    await clickMapAt(page, { x: 80, y: 50 })

    const searchButton = page.getByRole("button", {
      name: "Search within 500 m of line",
    })
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building along line")).toBeVisible({
      timeout: 15_000,
    })
    await expect(mobilePanel.getByText(smokeLineBuilding.name)).toBeVisible()
    await expect(page).toHaveURL(/search=line/)
  })

  test("applies filters, syncs them to the URL, and refetches results", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText(smokeAreaBuilding.name)).toBeVisible()

    await mobilePanel.getByRole("button", { name: /^Filters/ }).click()
    await expect(
      mobilePanel.getByRole("heading", { name: "Rental filters" }),
    ).toBeVisible()

    await mobilePanel.getByRole("button", { name: "1+ bed" }).click()
    await mobilePanel.getByRole("button", { name: "Apply filters" }).click()

    await expect(page).toHaveURL(/filters=/)
    await expect(mobilePanel.getByText("1+ bed")).toBeVisible()
    await expect(
      mobilePanel.getByRole("heading", { name: "Rental filters" }),
    ).toHaveCount(0)
  })

  test("recovers from a failed area search when the user retries", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page, { failAreaSearchOnce: true })
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("Search failed")).toBeVisible({
      timeout: 15_000,
    })
    await expect(mobilePanel.getByRole("alert")).toContainText(
      "Could not search this area",
    )

    await mobilePanel.getByRole("button", { name: "Retry search" }).click()

    await expect(mobilePanel.getByText("1 building")).toBeVisible({
      timeout: 15_000,
    })
    await expect(mobilePanel.getByText(smokeAreaBuilding.name)).toBeVisible()
    await expect(mobilePanel.getByText("Search failed")).toHaveCount(0)
  })
})
