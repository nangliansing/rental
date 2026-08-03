import { loadEnv } from "vite"
import { expect, test } from "@playwright/test"

import {
  installNeighbourhoodExploreRoute,
  openNeighbourhoodExplore,
} from "./fixtures/neighbourhood-explore"
import {
  openMapBuildingDetail,
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

    await waitForMapReady(page, { requireMap: false })
    await waitForAreaSearchResults(page, smokeAreaBuilding.name)

    const mobilePanel = await openMapBuildingDetail(page, smokeAreaBuilding.name)

    if (
      await page
        .getByText("Something went wrong")
        .isVisible()
        .catch(() => false)
    ) {
      await page.reload()
      await waitForMapReady(page, { requireMap: false })
      await waitForAreaSearchResults(page, smokeAreaBuilding.name)
      await openMapBuildingDetail(page, smokeAreaBuilding.name)
    }

    const ensureBuildingDetail = async () => {
      const onDetail = await mobilePanel
        .getByRole("heading", {
          name: `${smokeAreaBuilding.name} details`,
        })
        .isVisible()
        .catch(() => false)

      if (onDetail) return

      await page.goto(areaSearchUrl)
      await waitForMapReady(page, { requireMap: false })
      await waitForAreaSearchResults(page, smokeAreaBuilding.name)
      await openMapBuildingDetail(page, smokeAreaBuilding.name)
    }

    const exploreDialog = await openNeighbourhoodExplore(page, {
      scope: mobilePanel,
      ensureReady: ensureBuildingDetail,
    })

    await expect(async () => {
      const dialog = page.getByRole("dialog", {
        name: "Explore neighbourhood",
      })
      const tab = dialog.getByRole("tab", { name: /^Cafes(?: \(\d+\))?$/ })
      await tab.click({ force: true })
      await expect(
        dialog.getByRole("button", { name: /Smoke Corner Store/i }),
      ).not.toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 45_000 })

    await expect(exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i })).toBeVisible()

    const placeButton = exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i })
    await placeButton.click({ force: true })
    await expect(
      exploreDialog.getByRole("button", { name: /Smoke Lane Cafe/i }),
    ).toHaveAttribute("aria-current", "true")

    await page
      .getByRole("button", { name: "Close explore neighbourhood" })
      .click({ force: true })

    await expect(exploreDialog).not.toBeVisible()
    await expect(
      mobilePanel.getByRole("heading", {
        name: `${smokeAreaBuilding.name} details`,
      }),
    ).toBeVisible()
  })
})
