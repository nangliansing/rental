import { describe, expect, it } from "vitest"

import type { SavedSearchGeoSearch } from "@/features/saved-search/api"

import {
  savedSearchGeoSearchToReadOnlyMapGeo,
  formatSavedSearchGeoSummary,
  getSavedSearchStatusBadgeClassName,
} from "./savedSearchDetailDisplay"

describe("getSavedSearchStatusBadgeClassName", () => {
  it("uses muted styles for Closed and amber for Waiting", () => {
    expect(getSavedSearchStatusBadgeClassName("Closed")).toContain(
      "bg-slate-100",
    )
    expect(getSavedSearchStatusBadgeClassName("Waiting")).toContain(
      "bg-amber-50",
    )
  })
})

describe("savedSearchGeoSearchToReadOnlyMapGeo", () => {
  it("maps nearby geo to a circle scene", () => {
    const geoSearch: SavedSearchGeoSearch = {
      mode: "nearby",
      placeName: "Asok",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    }

    expect(savedSearchGeoSearchToReadOnlyMapGeo(geoSearch)).toEqual({
      kind: "circle",
      center: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    })
  })

  it("maps area geo to bounds", () => {
    const geoSearch: SavedSearchGeoSearch = {
      mode: "area",
      placeName: "Phrom Phong",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    }

    expect(savedSearchGeoSearchToReadOnlyMapGeo(geoSearch)).toEqual({
      kind: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    })
  })

  it("returns null when required geo fields are missing", () => {
    expect(
      savedSearchGeoSearchToReadOnlyMapGeo({
        mode: "nearby",
        placeName: "Incomplete",
      }),
    ).toBeNull()
  })
})

describe("formatSavedSearchGeoSummary", () => {
  it("summarizes nearby coverage", () => {
    expect(
      formatSavedSearchGeoSummary({
        mode: "nearby",
        placeName: "Asok",
        position: { lat: 13.7, lng: 100.5 },
        radiusMeters: 1000,
      }),
    ).toEqual({
      title: "Asok",
      detail: "Pin and 1 km coverage around it.",
    })
  })

  it("summarizes area coverage", () => {
    expect(
      formatSavedSearchGeoSummary({
        mode: "area",
        placeName: "Phrom Phong",
      }),
    ).toEqual({
      title: "Phrom Phong",
      detail: "The map area you saved with this search.",
    })
  })
})
