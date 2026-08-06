import { describe, expect, it } from "vitest"

import type { SavedSearchGeoSearch } from "@/features/saved-search/api"

import { savedSearchGeoSearchToSubmittedMapBuildingSearch } from "./savedSearchToMapBuildingSearch"

describe("savedSearchGeoSearchToSubmittedMapBuildingSearch", () => {
  it("maps a nearby search", () => {
    const geoSearch: SavedSearchGeoSearch = {
      mode: "nearby",
      placeName: "Asok",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    }

    expect(savedSearchGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
      source: "nearby",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    })
  })

  it("maps an area search", () => {
    const geoSearch: SavedSearchGeoSearch = {
      mode: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    }

    expect(savedSearchGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
      source: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    })
  })

  it("maps a line search and flattens MultiLineString to the first line", () => {
    const geoSearch: SavedSearchGeoSearch = {
      mode: "line",
      distanceMeters: 500,
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [100.5, 13.7],
            [100.52, 13.71],
          ],
        ],
      },
    }

    expect(savedSearchGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
      source: "line",
      distanceMeters: 500,
      geometry: {
        type: "LineString",
        coordinates: [
          [100.5, 13.7],
          [100.52, 13.71],
        ],
      },
    })
  })

  it("returns null when required geo fields are incomplete", () => {
    expect(
      savedSearchGeoSearchToSubmittedMapBuildingSearch({
        mode: "nearby",
        placeName: "Incomplete",
      }),
    ).toBeNull()
  })
})
