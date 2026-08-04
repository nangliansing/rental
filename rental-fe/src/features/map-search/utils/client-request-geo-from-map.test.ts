import { describe, expect, it } from "vitest"

import { buildMapClientRequestGeoSnapshot } from "./client-request-geo-from-map"

const pin = { lat: 13.7563, lng: 100.5018 }
const invalidPin = { lat: 91, lng: 100.5 }
const bounds = {
  northEast: { lat: 13.8, lng: 100.6 },
  southWest: { lat: 13.7, lng: 100.5 },
}
const invertedBounds = {
  northEast: { lat: 13.7, lng: 100.5 },
  southWest: { lat: 13.8, lng: 100.6 },
}
const linePoints = [
  { lat: 13.75, lng: 100.5 },
  { lat: 13.76, lng: 100.52 },
]

const baseInput = {
  selectedPin: null as typeof pin | null,
  nearbyRadiusMeters: 1_000,
  linePoints: [] as typeof linePoints,
  lineDistanceMeters: 500,
  visibleBounds: null as typeof bounds | null,
}

describe("buildMapClientRequestGeoSnapshot", () => {
  describe("pin / nearby", () => {
    it("prefers pin + radius when in pin mode", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "pin",
        selectedPin: pin,
        nearbyRadiusMeters: 1_000,
        visibleBounds: bounds,
        placeName: "  Bang Kapi  ",
      })

      expect(snapshot).toEqual({
        geoSearch: {
          mode: "nearby",
          position: pin,
          radiusMeters: 1_000,
          placeName: "Bang Kapi",
        },
        previewGeo: {
          kind: "circle",
          center: pin,
          radiusMeters: 1_000,
        },
        summaryTitle: "Pinned location",
        summaryDetail: "Pin and 1 km coverage around it.",
      })
    })

    it("formats sub-kilometer pin coverage in meters", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "pin",
        selectedPin: pin,
        nearbyRadiusMeters: 500,
      })

      expect(snapshot?.summaryDetail).toBe("Pin and 500 m coverage around it.")
    })

    it("falls back to visible bounds when pin is missing", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "pin",
          selectedPin: null,
          nearbyRadiusMeters: 1_000,
          visibleBounds: bounds,
        }),
      ).toMatchObject({
        geoSearch: { mode: "area", bounds },
        previewGeo: { kind: "area", bounds },
        summaryTitle: "Visible map area",
      })
    })

    it("falls back to visible bounds when pin coordinates are invalid", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "pin",
          selectedPin: invalidPin,
          nearbyRadiusMeters: 1_000,
          visibleBounds: bounds,
        })?.geoSearch.mode,
      ).toBe("area")
    })

    it("falls back to visible bounds when nearby radius is unsupported", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "pin",
          selectedPin: pin,
          nearbyRadiusMeters: 999,
          visibleBounds: bounds,
        })?.geoSearch.mode,
      ).toBe("area")
    })

    it("omits placeName when blank after trim", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "pin",
        selectedPin: pin,
        nearbyRadiusMeters: 1_000,
        placeName: "   ",
      })

      expect(snapshot?.geoSearch).not.toHaveProperty("placeName")
    })
  })

  describe("line", () => {
    it("uses line geometry when in line mode with enough points", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "line",
        selectedPin: pin,
        nearbyRadiusMeters: 1_000,
        linePoints,
        lineDistanceMeters: 500,
        visibleBounds: bounds,
        placeName: "Corridor",
      })

      expect(snapshot).toEqual({
        geoSearch: {
          mode: "line",
          geometry: {
            type: "LineString",
            coordinates: [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
          },
          distanceMeters: 500,
          placeName: "Corridor",
        },
        previewGeo: {
          kind: "line",
          paths: [
            [
              { lat: 13.75, lng: 100.5 },
              { lat: 13.76, lng: 100.52 },
            ],
          ],
          distanceMeters: 500,
        },
        summaryTitle: "Search line",
        summaryDetail: "Drawn line and 500 m coverage along it.",
      })
    })

    it("formats kilometer line coverage", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "line",
        linePoints,
        lineDistanceMeters: 1_000,
      })

      expect(snapshot?.summaryDetail).toBe(
        "Drawn line and 1 km coverage along it.",
      )
    })

    it("falls back to visible bounds when the line has fewer than 2 points", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "line",
          linePoints: [linePoints[0]],
          lineDistanceMeters: 500,
          visibleBounds: bounds,
        })?.geoSearch.mode,
      ).toBe("area")
    })

    it("falls back to visible bounds when line distance is unsupported", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "line",
          linePoints,
          lineDistanceMeters: 123,
          visibleBounds: bounds,
        })?.geoSearch.mode,
      ).toBe("area")
    })

    it("does not use a pin while in line mode even if a pin is present", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "line",
        selectedPin: pin,
        nearbyRadiusMeters: 1_000,
        linePoints,
        lineDistanceMeters: 500,
        visibleBounds: bounds,
      })

      expect(snapshot?.geoSearch.mode).toBe("line")
    })
  })

  describe("area / visible bounds", () => {
    it("builds an area snapshot from visible bounds", () => {
      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "area",
        visibleBounds: bounds,
        placeName: "  Bangkok  ",
      })

      expect(snapshot).toEqual({
        geoSearch: {
          mode: "area",
          bounds: {
            northEast: { lat: 13.8, lng: 100.6 },
            southWest: { lat: 13.7, lng: 100.5 },
          },
          placeName: "Bangkok",
        },
        previewGeo: {
          kind: "area",
          bounds: {
            northEast: { lat: 13.8, lng: 100.6 },
            southWest: { lat: 13.7, lng: 100.5 },
          },
        },
        summaryTitle: "Visible map area",
        summaryDetail: "The same area as Search this area on the map.",
      })
    })

    it("copies bounds so callers cannot mutate the snapshot via input", () => {
      const mutableBounds = {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      }

      const snapshot = buildMapClientRequestGeoSnapshot({
        ...baseInput,
        mode: "area",
        visibleBounds: mutableBounds,
      })

      mutableBounds.northEast.lat = 99

      expect(snapshot?.geoSearch.bounds.northEast.lat).toBe(13.8)
      expect(
        snapshot?.previewGeo.kind === "area" &&
          snapshot.previewGeo.bounds.northEast.lat,
      ).toBe(13.8)
    })

    it("returns null for inverted or incomplete bounds", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "area",
          visibleBounds: invertedBounds,
        }),
      ).toBeNull()

      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "area",
          visibleBounds: null,
        }),
      ).toBeNull()
    })
  })

  describe("priority and empty states", () => {
    it("returns null when nothing usable exists", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "area",
          selectedPin: null,
          linePoints: [],
          visibleBounds: null,
        }),
      ).toBeNull()
    })

    it("returns null when pin radius is bad and bounds are missing", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "pin",
          selectedPin: pin,
          nearbyRadiusMeters: 999,
          visibleBounds: null,
        }),
      ).toBeNull()
    })

    it("returns null when line is incomplete and bounds are missing", () => {
      expect(
        buildMapClientRequestGeoSnapshot({
          ...baseInput,
          mode: "line",
          linePoints: [linePoints[0]],
          lineDistanceMeters: 500,
          visibleBounds: null,
        }),
      ).toBeNull()
    })
  })
})
