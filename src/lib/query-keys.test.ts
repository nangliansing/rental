import { describe, expect, it } from "vitest"

import { queryKeys } from "./query-keys"

describe("queryKeys", () => {
  it("preserves existing list-key shapes", () => {
    expect(
      queryKeys.listings.ownerList({
        visibility: "public",
        sort: "latest",
        limit: 20,
      }),
    ).toEqual(["owner-listings", "public", "latest", 20])

    expect(
      queryKeys.savedListings.list({ limit: 20 }),
    ).toEqual(["saved-listings", 20])
  })

  it("provides prefixes for all viewer-specific listing details", () => {
    const prefix = queryKeys.listings.publicListingDetails("listing-1")
    const exact = queryKeys.listings.publicDetail("listing-1", "viewer-1")

    expect(exact.slice(0, prefix.length)).toEqual(prefix)
    expect(exact).toEqual(["public-listing", "listing-1", "viewer-1"])
  })

  it("keeps list and detail branches distinct", () => {
    expect(queryKeys.admin.reports.list("open")).toEqual([
      "admin-reports",
      "open",
    ])
    expect(queryKeys.admin.reports.detail("report-1")).toEqual([
      "admin-report",
      "report-1",
    ])
  })

  it("normalizes anonymous public-listing viewers", () => {
    expect(queryKeys.listings.publicDetail("listing-1", null)).toEqual([
      "public-listing",
      "listing-1",
      "anonymous",
    ])
  })

  it("groups every building-search mode under one mutation prefix", () => {
    const prefix = queryKeys.mapSearch.buildings
    const area = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const nearby = queryKeys.mapSearch.nearbyBuildingResults({
      position: { lat: 13.7, lng: 100.6 },
      radiusMeters: 500,
      filters: {},
      limit: 20,
    })
    const nearLines = queryKeys.mapSearch.nearLinesBuildingResults({
      geometry: {
        type: "LineString",
        coordinates: [
          [100.6, 13.7],
          [100.7, 13.8],
        ],
      },
      distanceMeters: 500,
      filters: {},
      limit: 20,
    })

    expect(area.slice(0, prefix.length)).toEqual(prefix)
    expect(nearby.slice(0, prefix.length)).toEqual(prefix)
    expect(nearLines.slice(0, prefix.length)).toEqual(prefix)
  })
})
