import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import { skipIfCiPlaceholderMapsKey } from "./fixtures/ci-maps"
import {
  activatePinOnIdleMap,
  clickMapControlButton,
  commitNearbyPinSearch,
  drawLineOnMap,
  getMobileResultsPanel,
  openMapBuildingDetail,
  triggerAreaSearchStaleState,
  waitForAreaSearchError,
  waitForAreaSearchResults,
  waitForSearchThisArea,
  waitForVisibleButton,
} from "./fixtures/map-search-helpers"
import { SMOKE_TEST_GEOLOCATION } from "./fixtures/test-geolocation"
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
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasMapsKey,
      "Set VITE_GOOGLE_MAPS_API_KEY in .env to run browser smoke tests.",
    )
  })

  test("drops a pin and commits a nearby search from the idle map", async ({
    page,
    context,
  }) => {
    skipIfCiPlaceholderMapsKey(test)
    test.setTimeout(180_000)

    await installMapSearchApiMocks(page)

    // Prime the maps script, then move to idle search before the auth timer expires.
    await page.goto(areaSearchUrl)
    await waitForMapReady(page)
    await page.goto("/")
    await waitForMapReady(page)

    await activatePinOnIdleMap(page, context)
    await commitNearbyPinSearch(page, smokeNearbyBuilding.name)
  })

  test("draws a line from the idle map and commits a search", async ({
    page,
  }) => {
    skipIfCiPlaceholderMapsKey(test)
    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)
    await waitForMapReady(page)

    await page.goto("/")
    await waitForMapReady(page)
    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Draw search line" }).click()
    await expect(
      page.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")

    await drawLineOnMap(page)
    await clickMapControlButton(page, /Search within .* of line/)

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
    skipIfCiPlaceholderMapsKey(test)
    await context.grantPermissions(["geolocation"])
    await context.setGeolocation(SMOKE_TEST_GEOLOCATION)

    await installMapSearchApiMocks(page)
    await page.goto("/")

    await waitForMapReady(page)
    await expect(getMobileResultsPanel(page)).toHaveCount(0)

    await waitForVisibleButton(page, "Use my location").then((button) =>
      button.click({ force: true }),
    )
    await expect(page.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 60_000 },
    )

    await clickMapControlButton(page, "Search within 1 km")

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel.getByText("1 building near pin").waitFor({
      state: "visible",
      timeout: 60_000,
    })
    await mobilePanel.getByText(smokeNearbyBuilding.name).waitFor({
      state: "visible",
      timeout: 60_000,
    })
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("commits a refreshed area search after the map is panned", async ({
    page,
  }) => {
    skipIfCiPlaceholderMapsKey(test)
    await installMapSearchApiMocks(page, { pannedAreaOnSecondSearch: true })
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    await expect(
      page.getByRole("button", { name: "Search this area" }),
    ).toHaveCount(0)

    await triggerAreaSearchStaleState(page)

    await waitForSearchThisArea(page)
    await clickMapControlButton(page, "Search this area")

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
    skipIfCiPlaceholderMapsKey(test)
    await installMapSearchApiMocks(page, {
      refreshedLineOnSecondSearch: true,
    })
    await page.goto(lineSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel.getByText(smokeLineBuilding.name).waitFor({
      state: "visible",
      timeout: 60_000,
    })
    await expect(
      page.getByRole("button", { name: "Search within 500 m of line" }),
    ).toHaveCount(0)

    await waitForVisibleButton(page, "Line search distance: 500 m").then(
      (button) => button.click(),
    )
    await waitForVisibleButton(page, "750 m", 60_000, { exact: true }).then(
      (button) => button.click(),
    )

    await clickMapControlButton(page, "Search updated line")

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

    const pageErrors: string[] = []
    page.on("pageerror", (error) => {
      pageErrors.push(error.message)
    })

    await installMapSearchApiMocks(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = await openMapBuildingDetail(
      page,
      smokeAreaBuilding.name,
    )

    await expect(
      page.getByRole("heading", { name: "Something went wrong" }),
    ).toHaveCount(0)

    await expect(async () => {
      const goBackBtn = mobilePanel.getByRole("button", { name: "Go back" })
      await expect(goBackBtn).toBeVisible({ timeout: 5_000 })
      await goBackBtn.click({ force: true, timeout: 10_000 })
      await expect(mobilePanel.getByText("1 building")).toBeVisible({
        timeout: 15_000,
      })
    }).toPass({ timeout: 60_000 })

    await expect(
      mobilePanel.getByRole("button", {
        name: new RegExp(smokeAreaBuilding.name),
      }),
    ).toBeVisible({ timeout: 30_000 })

    expect(
      pageErrors,
      `Unexpected page errors while opening building detail: ${pageErrors.join("; ")}`,
    ).toEqual([])
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
