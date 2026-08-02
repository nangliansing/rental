import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import {
  installNeighbourhoodExploreRoute,
  waitForNeighbourhoodExploreModal,
} from "./fixtures/neighbourhood-explore"
import {
  getMobileResultsPanel,
  waitForAreaSearchResults,
} from "./fixtures/map-search-helpers"
import {
  installMapSearchApiMocks,
  waitForMapReady,
} from "./fixtures/map-search-routes"
import {
  areaSearchUrl,
  smokeAreaBuilding,
} from "./fixtures/map-search-buildings"

const env = loadEnv("development", process.cwd(), "")
const hasMapsKey = Boolean(
  (process.env.VITE_GOOGLE_MAPS_API_KEY ?? env.VITE_GOOGLE_MAPS_API_KEY)?.trim(),
)

test.describe("Neighbourhood explore smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasMapsKey,
      "Set VITE_GOOGLE_MAPS_API_KEY in .env to run browser smoke tests.",
    )
  })

  test("opens explore, filters categories, selects a place, and closes", async ({
    page,
  }) => {
    await installMapSearchApiMocks(page)
    await installNeighbourhoodExploreRoute(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
    await mobilePanel
      .getByRole("button", { name: new RegExp(smokeAreaBuilding.name) })
      .click()

    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible()

    await mobilePanel
      .getByRole("button", { name: "Explore neighbourhood" })
      .click()

    const exploreDialog = page.getByRole("dialog", {
      name: "Explore neighbourhood",
    })
    await waitForNeighbourhoodExploreModal(page)

    await exploreDialog.waitFor({ state: "visible", timeout: 30_000 })
    await exploreDialog
      .getByRole("tab", { name: /^All(?: \(\d+\))?$/ })
      .waitFor({ state: "visible", timeout: 30_000 })
    await exploreDialog.getByRole("tab", { name: /^Cafes(?: \(\d+\))?$/ }).click()
    await expect(exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i })).toBeVisible()
    await expect(
      exploreDialog.getByRole("button", { name: /Smoke Corner Store/i }),
    ).not.toBeVisible()

    await exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i }).click()
    await expect(
      exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i }),
    ).toHaveAttribute("aria-current", "true")

    await exploreDialog
      .getByRole("button", { name: "Close explore neighbourhood" })
      .click()

    await expect(exploreDialog).not.toBeVisible()
    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible()
  })
})
