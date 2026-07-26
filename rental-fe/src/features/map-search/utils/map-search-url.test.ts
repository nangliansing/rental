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
      listingId: null,
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
      listingId: null,
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
      listingId: null,
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
      listingId: null,
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

  it("round-trips building and listing overlay params", () => {
    const params = writeMapSearchUrl(new URLSearchParams(), {
      source: "area",
      position: null,
      bounds: {
        northEast: { lat: 14, lng: 101 },
        southWest: { lat: 13, lng: 100 },
      },
      linePoints: [],
      radiusMeters: 1_000,
      filters: {},
      buildingId: "building-1",
      listingId: "listing-1",
    })

    expect(params.get("building")).toBe("building-1")
    expect(params.get("listing")).toBe("listing-1")
    expect(parseMapSearchUrl(params, {})).toMatchObject({
      buildingId: "building-1",
      listingId: "listing-1",
    })
  })

  it("drops listing params when building is missing", () => {
    expect(
      parseMapSearchUrl(
        new URLSearchParams("listing=listing-1"),
        {},
      ).listingId,
    ).toBeNull()
  })

  it("sanitizes unsupported filter properties", () => {
    const params = new URLSearchParams({
      filters: JSON.stringify({ minRent: 2_000, unknown: "value" }),
    })

    expect(parseMapSearchUrl(params, {}).filters).toEqual({ minRent: 2_000 })
  })
})
