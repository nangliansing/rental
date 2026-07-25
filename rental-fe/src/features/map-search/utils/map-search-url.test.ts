import { describe, expect, it } from "vitest"

import { parseMapSearchUrl, writeMapSearchUrl } from "./map-search-url"

describe("map search URL state", () => {
  it("round-trips a nearby search and preserves unrelated parameters", () => {
    const params = writeMapSearchUrl(new URLSearchParams("purpose=list"), {
      source: "nearby",
      position: { lat: 13.7653123, lng: 100.6420987 },
      linePoints: [],
      bounds: null,
      radiusMeters: 1_250,
      filters: { minRent: 4_000, isPetAllowed: true },
      buildingId: "building-1",
    })

    expect(params.get("purpose")).toBe("list")
    expect(params.get("lat")).toBe("13.76531")
    expect(parseMapSearchUrl(params, {})).toEqual({
      source: "nearby",
      position: { lat: 13.76531, lng: 100.6421 },
      linePoints: [],
      bounds: null,
      radiusMeters: 1_250,
      filters: { minRent: 4_000, isPetAllowed: true },
      buildingId: "building-1",
    })
  })

  it("falls back safely for malformed parameters", () => {
    const params = new URLSearchParams(
      "search=nearby&lat=999&lng=nope&radius=123&filters=%7Bbad",
    )

    expect(parseMapSearchUrl(params, { minRent: 1_000 })).toEqual({
      source: null,
      position: null,
      linePoints: [],
      bounds: null,
      radiusMeters: 1_000,
      filters: { minRent: 1_000 },
      buildingId: null,
    })
  })

  it("round-trips a line search", () => {
    const params = writeMapSearchUrl(new URLSearchParams(), {
      source: "line",
      position: null,
      bounds: null,
      linePoints: [
        { lat: 13.7653123, lng: 100.6420987 },
        { lat: 13.775, lng: 100.652 },
      ],
      radiusMeters: 500,
      filters: {},
      buildingId: null,
    })

    expect(parseMapSearchUrl(params, {})).toMatchObject({
      source: "line",
      linePoints: [
        { lat: 13.76531, lng: 100.6421 },
        { lat: 13.775, lng: 100.652 },
      ],
      radiusMeters: 500,
    })
  })

  it("sanitizes unsupported filter properties", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify({ minRent: 2_000, unknown: "value" }),
    })

    expect(parseMapSearchUrl(params, {}).filters).toEqual({ minRent: 2_000 })
  })
})
