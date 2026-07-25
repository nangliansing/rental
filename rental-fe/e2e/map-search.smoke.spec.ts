import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import {
  areaSearchUrl,
  nearbySearchUrl,
  smokeAreaBuilding,
  smokeNearbyBuilding,
} from "./fixtures/map-search-buildings"
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

    await installMapSearchApiMocks(page)
  })

  test("hydrates an area search with a real map and results panel", async ({
    page,
  }) => {
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = page.getByTestId("results-panel-mobile")
    await expect(mobilePanel).toBeVisible()
    await expect(mobilePanel.getByText("1 building")).toBeVisible()
    await expect(
      mobilePanel.getByText(smokeAreaBuilding.name),
    ).toBeVisible()
    await expect(page).toHaveURL(/search=area/)
  })

  test("hydrates a nearby search from the URL", async ({ page }) => {
    await page.goto(nearbySearchUrl)

    await waitForMapReady(page)

    const mobilePanel = page.getByTestId("results-panel-mobile")
    await expect(mobilePanel).toBeVisible()
    await expect(
      mobilePanel.getByText(smokeNearbyBuilding.name),
    ).toBeVisible()
    await expect(page).toHaveURL(/search=nearby/)
  })

  test("opens building detail and returns to the results list", async ({
    page,
  }) => {
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)

    const mobilePanel = page.getByTestId("results-panel-mobile")
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
      mobilePanel.getByRole("button", { name: new RegExp(smokeAreaBuilding.name) }),
    ).toBeVisible()
  })
})
