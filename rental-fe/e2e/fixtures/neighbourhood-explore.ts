import { expect, type Page, type Route } from "@playwright/test"

import { smokeAreaBuilding } from "./map-search-buildings"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export const smokeNeighbourhoodExploreData = {
  buildingId: smokeAreaBuilding._id,
  origin: {
    lat: smokeAreaBuilding.location.coordinates[1],
    lng: smokeAreaBuilding.location.coordinates[0],
  },
  radiusMeters: 1000,
  fetchRadiusMeters: 2000,
  fetchedAt: "2026-07-26T19:17:15.805Z",
  cacheStatus: "hit",
  source: "openstreetmap",
  summary: {
    all: 3,
    convenience: 1,
    cafe: 1,
    restaurant: 1,
  },
  categories: [
    {
      key: "convenience",
      label: "Convenience Stores",
      priority: 2,
      count: 1,
    },
    {
      key: "cafe",
      label: "Cafes",
      priority: 5,
      count: 1,
    },
    {
      key: "restaurant",
      label: "Restaurants",
      priority: 4,
      count: 1,
    },
  ],
  places: [
    {
      id: "place-convenience",
      name: "Smoke Corner Store",
      lat: 13.501,
      lng: 100.501,
      category: "convenience",
      distanceMeters: 180,
    },
    {
      id: "place-cafe",
      name: "Smoke Lane Cafe",
      lat: 13.502,
      lng: 100.502,
      category: "cafe",
      distanceMeters: 240,
    },
    {
      id: "place-restaurant",
      name: "Smoke Kitchen",
      lat: 13.503,
      lng: 100.503,
      category: "restaurant",
      distanceMeters: 320,
    },
  ],
}

export async function installNeighbourhoodExploreRoute(page: Page) {
  await page.route(
    "**/api/v1/buildings/*/neighbourhood**",
    async (route: Route) => {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: smokeNeighbourhoodExploreData,
        }),
      )
    },
  )
}

function isNeighbourhoodExploreResponse(url: string) {
  return url.includes("/neighbourhood")
}

async function closeNeighbourhoodExploreIfOpen(page: Page) {
  const exploreDialog = page.getByRole("dialog", {
    name: "Explore neighbourhood",
  })

  if (!(await exploreDialog.isVisible().catch(() => false))) {
    return
  }

  await page
    .getByRole("button", { name: "Close explore neighbourhood" })
    .click({ force: true })
  await expect(exploreDialog).not.toBeVisible({ timeout: 10_000 })
}

async function assertNeighbourhoodExploreContent(
  exploreDialog: ReturnType<Page["getByRole"]>,
) {
  const loadingLocator = exploreDialog.getByText("Loading nearby places...")
  const errorLocator = exploreDialog.getByText("Could not load nearby places")

  await expect
    .poll(
      async () => {
        if (await errorLocator.isVisible().catch(() => false)) {
          throw new Error("Neighbourhood explore failed to load nearby places.")
        }

        if (await loadingLocator.isVisible().catch(() => false)) {
          return "loading"
        }

        const hasTablist = await exploreDialog
          .getByRole("tablist", { name: "Neighbourhood categories" })
          .isVisible()
          .catch(() => false)
        const hasAllTab = await exploreDialog
          .getByRole("tab", { name: /^All(?: \(\d+\))?$/ })
          .isVisible()
          .catch(() => false)
        const hasPlace = await exploreDialog
          .getByRole("button", { name: /Smoke Lane Cafe/i })
          .isVisible()
          .catch(() => false)
        const hasNearbyPlaces = await exploreDialog
          .getByText("Nearby places")
          .isVisible()
          .catch(() => false)

        return hasTablist || hasAllTab || hasPlace || hasNearbyPlaces
          ? "ready"
          : "waiting"
      },
      { timeout: 60_000 },
    )
    .toBe("ready")
}

export async function openNeighbourhoodExplore(
  page: Page,
  options?: {
    scope?: ReturnType<Page["locator"]>
    ensureReady?: () => Promise<void>
  },
) {
  const scope = options?.scope ?? page

  await expect(async () => {
    await closeNeighbourhoodExploreIfOpen(page)
    await options?.ensureReady?.()

    const exploreButton = scope
      .getByRole("button", { name: "Explore neighbourhood" })
      .or(page.getByRole("button", { name: "Explore neighbourhood" }))
    await expect(exploreButton).toBeVisible({ timeout: 15_000 })

    const neighbourhoodResponse = page
      .waitForResponse(
        (response) =>
          isNeighbourhoodExploreResponse(response.url()) &&
          response.request().method() === "GET" &&
          response.ok(),
        { timeout: 20_000 },
      )
      .catch(() => null)

    await exploreButton.click({ force: true })

    const exploreDialog = page.getByRole("dialog", {
      name: "Explore neighbourhood",
    })
    await expect(exploreDialog).toBeVisible({ timeout: 15_000 })
    await neighbourhoodResponse
    await assertNeighbourhoodExploreContent(exploreDialog)
  }).toPass({ timeout: 120_000 })

  return page.getByRole("dialog", { name: "Explore neighbourhood" })
}

export async function waitForNeighbourhoodExploreModal(page: Page) {
  const exploreDialog = page.getByRole("dialog", {
    name: "Explore neighbourhood",
  })

  await expect(exploreDialog).toBeVisible({ timeout: 15_000 })
  await assertNeighbourhoodExploreContent(exploreDialog)

  return exploreDialog
}
