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
    test.setTimeout(180_000)

    await installMapSearchApiMocks(page)
    await installNeighbourhoodExploreRoute(page)
    await page.goto(areaSearchUrl)

    await waitForMapReady(page)
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = getMobileResultsPanel(page)
    await expect(mobilePanel).toBeVisible({ timeout: 60_000 })

    const buildingButton = mobilePanel.getByRole("button", {
      name: new RegExp(smokeAreaBuilding.name),
    })
    await expect(buildingButton).toBeVisible({ timeout: 30_000 })
    await buildingButton.click({ timeout: 10_000 })

    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible({ timeout: 30_000 })

    const exploreButton = mobilePanel.getByRole("button", {
      name: "Explore neighbourhood",
    })
    await expect(exploreButton).toBeVisible({ timeout: 30_000 })
    await exploreButton.click({ timeout: 10_000 })

    const exploreDialog = page.getByRole("dialog", {
      name: "Explore neighbourhood",
    })
    await waitForNeighbourhoodExploreModal(page)

    const allTab = exploreDialog.getByRole("tab", {
      name: /^All(?: \(\d+\))?$/,
    })
    await allTab.waitFor({ state: "visible", timeout: 60_000 })
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
