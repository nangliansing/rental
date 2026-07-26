import { describe, expect, it } from "vitest"

import {
  buildActiveMapSearchUrlState,
  createSubmittedSearchStateFromUrl,
  linePointsToGeometry,
} from "./map-search-url"

describe("map search URL submission helpers", () => {
  it("builds line geometry from map points", () => {
    expect(
      linePointsToGeometry([
        { lat: 13.7, lng: 100.6 },
        { lat: 13.8, lng: 100.7 },
      ]),
    ).toEqual({
      type: "LineString",
      coordinates: [
        [100.6, 13.7],
        [100.7, 13.8],
      ],
    })
  })

  it("returns null geometry for fewer than two points", () => {
    expect(linePointsToGeometry([{ lat: 13.7, lng: 100.6 }])).toBeNull()
    expect(linePointsToGeometry([])).toBeNull()
  })

  it("creates submitted search defaults from a nearby URL state", () => {
    expect(
      createSubmittedSearchStateFromUrl({
        source: "nearby",
        bounds: null,
        position: { lat: 13.7, lng: 100.6 },
        linePoints: [],
        radiusMeters: 750,
        filters: {},
        buildingId: null,
        listingId: null,
      }),
    ).toMatchObject({
      searchSource: "nearby",
      submittedNearbyPosition: { lat: 13.7, lng: 100.6 },
      nearbyRadiusMeters: 750,
      pendingBuildingId: null,
      cameraRestoreVersion: 1,
    })
  })

  it("uses mode-specific defaults when the source does not own the radius", () => {
    expect(
      createSubmittedSearchStateFromUrl({
        source: "area",
        bounds: {
          northEast: { lat: 14, lng: 101 },
          southWest: { lat: 13, lng: 100 },
        },
        position: null,
        linePoints: [],
        radiusMeters: 750,
        filters: {},
        buildingId: "building-1",
        listingId: null,
      }),
    ).toMatchObject({
      searchSource: "area",
      submittedBounds: {
        northEast: { lat: 14, lng: 101 },
        southWest: { lat: 13, lng: 100 },
      },
      pendingBuildingId: "building-1",
    })
  })

  it("builds the active URL payload for the current submitted search", () => {
    expect(
      buildActiveMapSearchUrlState({
        searchSource: "line",
        submittedBounds: null,
        submittedNearbyPosition: null,
        submittedLinePoints: [
          { lat: 13.7, lng: 100.6 },
          { lat: 13.8, lng: 100.7 },
        ],
        lineDistanceMeters: 500,
        nearbyRadiusMeters: 1_000,
        filters: { minRent: 2_000 },
        buildingId: "building-1",
        listingId: null,
      }),
    ).toEqual({
      source: "line",
      bounds: null,
      position: null,
      linePoints: [
        { lat: 13.7, lng: 100.6 },
        { lat: 13.8, lng: 100.7 },
      ],
      radiusMeters: 500,
      filters: { minRent: 2_000 },
      buildingId: "building-1",
      listingId: null,
    })
  })
})
