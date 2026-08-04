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

const areaSearchResponseGate = {
  blocked: false,
}

export function allowAreaSearchResponses() {
  areaSearchResponseGate.blocked = false
}

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
  areaSearchResponseGate.blocked = Boolean(options.failAreaSearchOnce)

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
    if (areaSearchResponseGate.blocked) {
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
    "**/api/v1/buildings/*/listings/search**",
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

export type WaitForMapReadyOptions = {
  /** When false, pass once the mobile results panel is visible even if the map failed. */
  requireMap?: boolean
}

export async function waitForMapReady(
  page: Page,
  options: WaitForMapReadyOptions = {},
) {
  const requireMap = options.requireMap ?? true
  const mapCanvas = page.locator(".gm-style").first()
  const unavailable = page.getByText("Map temporarily unavailable")
  const resultsPanel = page.getByTestId("results-panel-mobile")
  const maxAttempts = requireMap ? 3 : 1

  const hasFallbackResults = async () =>
    !requireMap && (await resultsPanel.isVisible().catch(() => false))

  const isMapInteractive = async () =>
    await mapCanvas.isVisible().catch(() => false)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page
      .getByText("Loading map...")
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {})

    if (await isMapInteractive()) {
      return
    }

    if (await hasFallbackResults()) {
      return
    }

    // When the map is optional, never reload — a reload races URL-seeded search
    // hydration under the CI placeholder Maps key. Return as soon as the map,
    // results panel, or unavailable card settles so toasts are still visible.
    if (!requireMap) {
      const deadline = Date.now() + 20_000
      while (Date.now() < deadline) {
        if (await isMapInteractive()) return
        if (await hasFallbackResults()) return
        if (await unavailable.isVisible().catch(() => false)) return
        await page.waitForTimeout(250)
      }
      return
    }

    if (await unavailable.isVisible().catch(() => false)) {
      if (attempt < maxAttempts - 1) {
        await page.reload({ waitUntil: "domcontentloaded" })
        continue
      }

      throw new Error("Google Maps failed to load.")
    }

    try {
      await mapCanvas.waitFor({
        state: "visible",
        timeout: 45_000,
      })
      return
    } catch (error) {
      if (await isMapInteractive()) {
        return
      }

      if (attempt < maxAttempts - 1) {
        await page.reload({ waitUntil: "domcontentloaded" })
        continue
      }

      throw error
    }
  }
}
