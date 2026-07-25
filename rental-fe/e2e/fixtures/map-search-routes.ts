import type { Page, Route } from "@playwright/test"

import {
  smokeAreaBuilding,
  smokeLineBuilding,
  smokeNearbyBuilding,
  smokePannedAreaBuilding,
} from "./map-search-buildings"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export type MapSearchMockOptions = {
  failAreaSearchOnce?: boolean
  pannedAreaOnSecondSearch?: boolean
}

export async function installMapSearchApiMocks(
  page: Page,
  options: MapSearchMockOptions = {},
) {
  let areaSearchCalls = 0

  await page.route("**/api/v1/search/buildings/map", async (route: Route) => {
    areaSearchCalls += 1

    if (options.failAreaSearchOnce && areaSearchCalls === 1) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "INTERNAL_ERROR",
            message: "Simulated search failure",
          },
          500,
        ),
      )
      return
    }

    const building =
      options.pannedAreaOnSecondSearch && areaSearchCalls > 1
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
      await route.fulfill(
        jsonRoute({
          success: true,
          data: [smokeNearbyBuilding],
        }),
      )
    },
  )

  await page.route(
    "**/api/v1/search/buildings/near-lines",
    async (route: Route) => {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: [smokeLineBuilding],
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
}
