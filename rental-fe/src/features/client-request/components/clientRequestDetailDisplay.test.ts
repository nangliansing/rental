import { describe, expect, it } from "vitest"

import type { ClientRequestGeoSearch } from "@/features/client-request/api"

import {
  clientRequestGeoSearchToReadOnlyMapGeo,
  formatClientRequestGeoSummary,
  getClientRequestStatusBadgeClassName,
} from "./clientRequestDetailDisplay"

describe("getClientRequestStatusBadgeClassName", () => {
  it("uses muted styles for Closed and amber for Waiting", () => {
    expect(getClientRequestStatusBadgeClassName("Closed")).toContain(
      "bg-slate-100",
    )
    expect(getClientRequestStatusBadgeClassName("Waiting")).toContain(
      "bg-amber-50",
    )
  })
})

describe("clientRequestGeoSearchToReadOnlyMapGeo", () => {
  it("maps nearby geo to a circle scene", () => {
    const geoSearch: ClientRequestGeoSearch = {
      mode: "nearby",
      placeName: "Asok",
      position: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    }

    expect(clientRequestGeoSearchToReadOnlyMapGeo(geoSearch)).toEqual({
      kind: "circle",
      center: { lat: 13.7, lng: 100.5 },
      radiusMeters: 1000,
    })
  })

  it("maps area geo to bounds", () => {
    const geoSearch: ClientRequestGeoSearch = {
      mode: "area",
      placeName: "Phrom Phong",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    }

    expect(clientRequestGeoSearchToReadOnlyMapGeo(geoSearch)).toEqual({
      kind: "area",
      bounds: {
        northEast: { lat: 13.8, lng: 100.6 },
        southWest: { lat: 13.7, lng: 100.5 },
      },
    })
  })

  it("returns null when required geo fields are missing", () => {
    expect(
      clientRequestGeoSearchToReadOnlyMapGeo({
        mode: "nearby",
        placeName: "Incomplete",
      }),
    ).toBeNull()
  })
})

describe("formatClientRequestGeoSummary", () => {
  it("summarizes nearby coverage", () => {
    expect(
      formatClientRequestGeoSummary({
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
      formatClientRequestGeoSummary({
        mode: "area",
        placeName: "Phrom Phong",
      }),
    ).toEqual({
      title: "Phrom Phong",
      detail: "The map area you saved with this search.",
    })
  })
})
