import { expect, type Locator, type Page, type Route } from "@playwright/test"

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

export async function openNeighbourhoodExplore(
  page: Page,
  scope: Page | Locator = page,
) {
  const exploreDialog = page.getByRole("dialog", {
    name: "Explore neighbourhood",
  })
  const exploreButton = scope.getByRole("button", {
    name: "Explore neighbourhood",
  })

  await expect(async () => {
    await expect(exploreButton).toBeVisible({ timeout: 10_000 })
    await exploreButton.scrollIntoViewIfNeeded()

    const neighbourhoodResponse = page.waitForResponse(
      (response) =>
        isNeighbourhoodExploreResponse(response.url()) &&
        response.request().method() === "GET" &&
        response.ok(),
      { timeout: 60_000 },
    )

    await exploreButton.click({ timeout: 5_000 })
    await exploreDialog.waitFor({ state: "visible", timeout: 15_000 })
    await neighbourhoodResponse
  }).toPass({ timeout: 90_000 })
}

export async function waitForNeighbourhoodExploreModal(page: Page) {
  const exploreDialog = page.getByRole("dialog", {
    name: "Explore neighbourhood",
  })

  await exploreDialog.waitFor({ state: "visible", timeout: 60_000 })

  await expect(
    exploreDialog.getByText("Loading nearby places..."),
  ).toBeHidden({ timeout: 60_000 })

  await expect(
    exploreDialog.getByRole("tablist", { name: "Neighbourhood categories" }),
  ).toBeVisible({ timeout: 90_000 })

  if (
    await exploreDialog
      .getByText("Could not load nearby places")
      .isVisible()
      .catch(() => false)
  ) {
    throw new Error("Neighbourhood explore failed to load nearby places.")
  }

  const resultsDrawer = exploreDialog.getByTestId(
    "neighbourhood-explore-results-drawer",
  )
  if ((await resultsDrawer.count()) > 0) {
    await resultsDrawer.waitFor({ state: "visible", timeout: 30_000 })
  }
}
