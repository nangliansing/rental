import { describe, expect, it } from "vitest"

import type { ClientRequestGeoSearch } from "@/features/client-request/api"

import { clientRequestGeoSearchToSubmittedMapBuildingSearch } from "./clientRequestToMapBuildingSearch"

describe("clientRequestGeoSearchToSubmittedMapBuildingSearch", () => {
  it("maps a nearby search", () => {
    const geoSearch: ClientRequestGeoSearch = {
      mode: "nearby",
      placeName: "Asok",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    }

    expect(clientRequestGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
      source: "nearby",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    })
  })

  it("maps an area search", () => {
    const geoSearch: ClientRequestGeoSearch = {
      mode: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    }

    expect(clientRequestGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
      source: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    })
  })

  it("maps a line search and flattens MultiLineString to the first line", () => {
    const geoSearch: ClientRequestGeoSearch = {
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

    expect(clientRequestGeoSearchToSubmittedMapBuildingSearch(geoSearch)).toEqual({
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
      clientRequestGeoSearchToSubmittedMapBuildingSearch({
        mode: "nearby",
        placeName: "Incomplete",
      }),
    ).toBeNull()
  })
})
