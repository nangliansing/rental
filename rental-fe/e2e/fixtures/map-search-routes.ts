import type { Page, Route } from "@playwright/test"

import {
  smokeAreaBuilding,
  smokeLineBuilding,
  smokeNearbyBuilding,
  smokePannedAreaBuilding,
  smokeRefreshedLineBuilding,
  smokeRefreshedNearbyBuilding,
} from "./map-search-buildings"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

// React Query defaults to 3 retries (4 total attempts) before surfacing an error.
const INITIAL_AREA_SEARCH_ATTEMPTS = 4

export type MapSearchMockOptions = {
  failAreaSearchOnce?: boolean
  pannedAreaOnSecondSearch?: boolean
  refreshedNearbyOnSecondSearch?: boolean
  refreshedLineOnSecondSearch?: boolean
}

// Matches `areaSearchUrl` bounds used in smoke tests.
function isInitialAreaSearchBounds(bounds: unknown) {
  if (!bounds || typeof bounds !== "object") return false

  const candidate = bounds as {
    northEast?: { lat?: number; lng?: number }
    southWest?: { lat?: number; lng?: number }
  }

  return (
    candidate.northEast?.lat === 14 &&
    candidate.northEast?.lng === 101 &&
    candidate.southWest?.lat === 13 &&
    candidate.southWest?.lng === 100
  )
}

export async function installMapSearchApiMocks(
  page: Page,
  options: MapSearchMockOptions = {},
) {
  let areaSearchFailuresRemaining = options.failAreaSearchOnce
    ? INITIAL_AREA_SEARCH_ATTEMPTS
    : 0

  await page.route("**/api/v1/users/me", async (route: Route) => {
    await route.fulfill(
      jsonRoute(
        { success: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        401,
      ),
    )
  })

  await page.route("**/api/v1/users/token/refresh", async (route: Route) => {
    await route.fulfill(
      jsonRoute(
        { success: false, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" },
        401,
      ),
    )
  })

  await page.route("**/api/v1/search/buildings/map", async (route: Route) => {
    if (areaSearchFailuresRemaining > 0) {
      areaSearchFailuresRemaining -= 1
      await route.abort("failed")
      return
    }

    const requestBody = route.request().postDataJSON() as {
      bounds?: unknown
    } | null
    const usePannedBuilding =
      options.pannedAreaOnSecondSearch &&
      !isInitialAreaSearchBounds(requestBody?.bounds)

    const building = usePannedBuilding
      ? smokePannedAreaBuilding
      : smokeAreaBuilding

    await route.fulfill(
      jsonRoute({
        success: true,
        data: [building],
        pagination: { page: 1, limit: 20, total: 1 },
      }),
    )
  })

  await page.route(
    "**/api/v1/search/buildings/nearby",
    async (route: Route) => {
      const requestBody = route.request().postDataJSON() as {
        radiusMeters?: number
      } | null
      const useRefreshedBuilding =
        options.refreshedNearbyOnSecondSearch &&
        requestBody?.radiusMeters === 500

      const building = useRefreshedBuilding
        ? smokeRefreshedNearbyBuilding
        : smokeNearbyBuilding

      await route.fulfill(
        jsonRoute({
          success: true,
          data: [building],
        }),
      )
    },
  )

  await page.route(
    "**/api/v1/search/buildings/near-lines",
    async (route: Route) => {
      const requestBody = route.request().postDataJSON() as {
        distanceMeters?: number
      } | null
      const useRefreshedBuilding =
        options.refreshedLineOnSecondSearch &&
        requestBody?.distanceMeters === 750

      const building = useRefreshedBuilding
        ? smokeRefreshedLineBuilding
        : smokeLineBuilding

      await route.fulfill(
        jsonRoute({
          success: true,
          data: [building],
          pagination: { page: 1, limit: 20, total: 1 },
        }),
      )
    },
  )

  await page.route(
    "**/api/v1/search/buildings/*/listings",
    async (route: Route) => {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            building: {
              _id: smokeAreaBuilding._id,
              name: smokeAreaBuilding.name,
              buildingType: smokeAreaBuilding.buildingType,
              facilities: smokeAreaBuilding.facilities,
              security: smokeAreaBuilding.security,
              location: smokeAreaBuilding.location,
              address: smokeAreaBuilding.address,
              minRent: smokeAreaBuilding.minRent,
              maxRent: smokeAreaBuilding.maxRent,
            },
            listings: [],
          },
          pagination: { page: 1, limit: 20, total: 0 },
        }),
      )
    },
  )
}

export async function waitForMapReady(page: Page) {
  await page.getByText("Loading map...").waitFor({
    state: "hidden",
    timeout: 20_000,
  })
  await page.getByText("Map temporarily unavailable").waitFor({
    state: "hidden",
    timeout: 5_000,
  })
  await page.locator(".gm-style").first().waitFor({
    state: "visible",
    timeout: 20_000,
  })
}
