import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import {
  drawLineOnMap,
  getMobileResultsPanel,
  triggerAreaSearchStaleState,
  waitForAreaSearchError,
  waitForAreaSearchResults,
  waitForSearchThisArea,
} from "./fixtures/map-search-helpers"
import {
  allowAreaSearchResponses,
  installMapSearchApiMocks,
  waitForMapReady,
} from "./fixtures/map-search-routes"
import {
  areaSearchUrl,
  lineSearchUrl,
  nearbySearchUrl,
  nearbySearchUrl500,
  smokeAreaBuilding,
  smokeLineBuilding,
  smokeNearbyBuilding,
  smokePannedAreaBuilding,
  smokeRefreshedLineBuilding,
  smokeRefreshedNearbyBuilding,
} from "./fixtures/map-search-buildings"

const env = loadEnv("development", process.cwd(), "")
const hasMapsKey = Boolean(
  (process.env.VITE_GOOGLE_MAPS_API_KEY ?? env.VITE_GOOGLE_MAPS_API_KEY)?.trim(),
)

test.describe("Map search smoke", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 })

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasMapsKey,
      "Set VITE_GOOGLE_MAPS_API_KEY in .env to run browser smoke tests.",
    )
  })

  test("drops a pin and commits a nearby search from the idle map", async ({
    page,
  }) => {
    test.setTimeout(180_000)

    await installMapSearchApiMocks(page)

    await expect(async () => {
      await page.goto("/")
      await waitForMapReady(page)

      const dropPinButton = page.getByRole("button", { name: "Drop pin" })
      await dropPinButton.scrollIntoViewIfNeeded()
      await dropPinButton.click({ force: true })

      await expect(page.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
        "aria-pressed",
        "true",
        { timeout: 10_000 },
      )
    }).toPass({ timeout: 120_000 })

    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await expect(async () => {
      const searchButton = page.getByRole("button", {
        name: "Search within 1 km",
      })
      await expect(searchButton).toBeEnabled({ timeout: 5_000 })
      await searchButton.click({ force: true })
    }).toPass({ timeout: 30_000 })

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building near pin")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeNearbyBuilding.name)).toBeVisible()
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("draws a line from the idle map and commits a search", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto("/")

    await waitForMapReady(page)
    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Draw search line" }).click()
    await expect(
      page.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")

    await drawLineOnMap(page)

    const searchButton = page.getByRole("button", {
      name: /Search within .* of line/,
    })
    await searchButton.click()

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building along line")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeLineBuilding.name)).toBeVisible()
    await expect(page).toHaveURL(/search=line/)
  })

  test("uses my location to drop a pin and commit a nearby search", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"])
    await context.setGeolocation({ latitude: 13.7563, longitude: 100.5018 })

    await installMapSearchApiMocks(page)
    await page.goto("/")

    await waitForMapReady(page)
    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Use my location" }).click()
    await expect(page.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 20_000 },
    )

    const searchButton = page.getByRole("button", {
      name: "Search within 1 km",
    })
    await expect(searchButton).toBeEnabled({ timeout: 20_000 })
    await searchButton.click({ force: true })

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building near pin")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeNearbyBuilding.name)).toBeVisible()
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("commits a refreshed area search after the map is panned", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page, { pannedAreaOnSecondSearch: true })
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    await expect(
      page.getByRole("button", { name: "Search this area" }),
    ).toHaveCount(0)

    await triggerAreaSearchStaleState(page)

    const searchButton = page.getByRole("button", { name: "Search this area" })
    await waitForSearchThisArea(page)
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText("1 building")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokePannedAreaBuilding.name)).toBeVisible({
      timeout: 20_000,
    })
    await expect(page).toHaveURL(/search=area/)
  })

  test("commits a refreshed line search after distance changes", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page, {
      refreshedLineOnSecondSearch: true,
    })
    await page.goto(lineSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText(smokeLineBuilding.name)).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByRole("button", { name: "Search within 500 m of line" }),
    ).toHaveCount(0)

    await page
      .getByRole("button", { name: "Line search distance: 500 m" })
      .click()
    await page.getByRole("button", { name: "750 m", exact: true }).click()

    const searchButton = page.getByRole("button", {
      name: "Search updated line",
    })
    await expect(searchButton).toBeVisible({ timeout: 20_000 })
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    await expect(mobilePanel.getByText("1 building along line")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeRefreshedLineBuilding.name)).toBeVisible({
      timeout: 20_000,
    })
    await expect(page).toHaveURL(/radius=750/)
  })

  test("hydrates an area search with a real map and results panel", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    await expect(page).toHaveURL(/search=area/)
  })

  test("hydrates a nearby search from the URL", async ({ page }) => {
    test.setTimeout(120_000)

    await installMapSearchApiMocks(page)
    const nearbyResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/search/buildings/nearby") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 30_000 },
    )
    await page.goto(nearbySearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await nearbyResponse

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel).toBeVisible({ timeout: 30_000 })
    await expect(mobilePanel.getByText(smokeNearbyBuilding.name)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("hydrates a line search from the URL", async ({ page }) => {
    await installMapSearchApiMocks(page)
    await page.goto(lineSearchUrl)

    await waitForMapReady(page, { requireMap: false })

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel).toBeVisible({ timeout: 20_000 })
    await expect(mobilePanel.getByText("1 building along line")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeLineBuilding.name)).toBeVisible({
      timeout: 20_000,
    })
    await expect(page).toHaveURL(/search=line/)
  })

  test("opens building detail and returns to the results list", async ({
    page,
  }) => {
    test.setTimeout(120_000)

    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
    const buildingBtn = mobilePanel.getByRole("button", {
      name: new RegExp(smokeAreaBuilding.name),
    })
    await buildingBtn.waitFor({ state: "visible", timeout: 30_000 })
    await buildingBtn.click({ timeout: 20_000 })

    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible({ timeout: 30_000 })

    const goBackBtn = mobilePanel.getByRole("button", { name: "Go back" })
    await goBackBtn.waitFor({ state: "visible", timeout: 30_000 })
    await goBackBtn.click({ timeout: 20_000 })

    await expect(mobilePanel.getByText("1 building")).toBeVisible({
      timeout: 30_000,
    })
    await expect(
      mobilePanel.getByRole("button", {
        name: new RegExp(smokeAreaBuilding.name),
      }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test("commits a refreshed nearby search after radius changes", async ({
    page,
  }) => {
    test.setTimeout(120_000)

    await installMapSearchApiMocks(page, {
      refreshedNearbyOnSecondSearch: true,
    })
    await page.goto(nearbySearchUrl)

    await waitForMapReady(page, { requireMap: false })

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel.getByText(smokeNearbyBuilding.name)).toBeVisible({
      timeout: 20_000,
    })
    await page.goto(nearbySearchUrl500)

    await expect(mobilePanel.getByText("1 building near pin")).toBeVisible({
      timeout: 45_000,
    })
    await expect(
      mobilePanel.getByText(smokeRefreshedNearbyBuilding.name),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/radius=500/)
  })

  test("applies filters, syncs them to the URL, and refetches results", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
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

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchError(page)

    allowAreaSearchResponses()

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel.getByRole("button", { name: "Retry search" }).click()

    await expect(mobilePanel.getByText("1 building")).toBeVisible({
      timeout: 20_000,
    })
    await expect(mobilePanel.getByText(smokeAreaBuilding.name)).toBeVisible()
    await expect(mobilePanel.getByRole("alert")).toHaveCount(0)
  })
})
