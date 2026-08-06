import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  parseSavedSearch,
  parseSavedSearchFilters,
  parseSavedSearchGeoSearch,
  parseSavedSearchStatus,
  parseGetOwnerSavedSearchByIdResponse,
  parseSearchOwnerSavedSearchesResponse,
} from "./savedSearchParsers"

const areaSavedSearch = {
  _id: "6a70f2002c0e518d5b689200",
  createdBy: "6a5638bafc6d6328c9e1b281",
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15000,
    maxRent: 35000,
    availableBy: "2026-09-01T17:00:00.000Z",
    agentProfileIds: ["6a5638bafc6d6328c9e1b299"],
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

describe("parseSavedSearchStatus", () => {
  it.each([
    ["Waiting", "Waiting"],
    ["Closed", "Closed"],
  ] as const)("accepts %s", (input, expected) => {
    expect(parseSavedSearchStatus(input)).toBe(expected)
  })

  it.each([
    [undefined],
    [null],
    [""],
    ["waiting"],
    ["Open"],
    [123],
    [{}],
  ])("falls back for invalid status %# (%j)", value => {
    expect(parseSavedSearchStatus(value)).toBe("Waiting")
    expect(parseSavedSearchStatus(value, "Closed")).toBe("Closed")
  })
})

describe("parseSavedSearchGeoSearch", () => {
  it("parses area bounds and placeName", () => {
    expect(parseSavedSearchGeoSearch(areaSavedSearch.geoSearch)).toEqual({
      mode: "area",
      bounds: {
        northEast: { lat: 13.78, lng: 100.66 },
        southWest: { lat: 13.75, lng: 100.62 },
      },
      placeName: "Phrom Phong",
    })
  })

  it("parses nearby position and radius", () => {
    expect(
      parseSavedSearchGeoSearch({
        mode: "nearby",
        position: { lat: 13.75, lng: 100.5 },
        radiusMeters: 1200,
        placeName: null,
      }),
    ).toEqual({
      mode: "nearby",
      position: { lat: 13.75, lng: 100.5 },
      radiusMeters: 1200,
      placeName: null,
    })
  })

  it("parses line and MultiLineString geometry", () => {
    expect(
      parseSavedSearchGeoSearch({
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [
            [100.5, 13.75],
            [100.52, 13.76],
            ["bad", 1],
          ],
        },
        distanceMeters: 400,
      }),
    ).toEqual({
      mode: "line",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.5, 13.75],
          [100.52, 13.76],
        ],
      },
      distanceMeters: 400,
    })

    expect(
      parseSavedSearchGeoSearch({
        mode: "line",
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
            "not-a-line",
          ],
        },
        distanceMeters: 250,
      }).geometry,
    ).toEqual({
      type: "MultiLineString",
      coordinates: [
        [
          [100.5, 13.75],
          [100.52, 13.76],
        ],
      ],
    })
  })

  it("defaults unknown mode to area and drops invalid nested shapes", () => {
    expect(
      parseSavedSearchGeoSearch({
        mode: "pin",
        bounds: { northEast: { lat: 1 } },
        position: { lat: "x", lng: 2 },
        radiusMeters: "far",
        geometry: { type: "Point", coordinates: [1, 2] },
        distanceMeters: Number.NaN,
      }),
    ).toEqual({ mode: "area" })
  })

  it("tolerates null/non-object geoSearch", () => {
    expect(parseSavedSearchGeoSearch(null)).toEqual({ mode: "area" })
    expect(parseSavedSearchGeoSearch("area")).toEqual({ mode: "area" })
  })

  it("omits placeName when the field is absent", () => {
    expect(parseSavedSearchGeoSearch({ mode: "area" })).toEqual({
      mode: "area",
    })
  })
})

describe("parseSavedSearchFilters", () => {
  it("keeps every supported filter shape", () => {
    expect(
      parseSavedSearchFilters({
        minRent: 10000,
        maxRent: 20000,
        bedroomCount: 2,
        bathroomCount: 1,
        contractMonths: 12,
        occupancy: 2,
        buildingType: "Apartment",
        kitchenType: "Separate",
        availableBy: "2026-09-01T17:00:00.000Z",
        isForeignerAccepted: true,
        isTM30Provided: false,
        isCookingAllowed: true,
        isPetAllowed: false,
        buildingFacilities: ["Parking", 1, ""],
        security: ["CCTV"],
        listingFacilities: ["Aircon"],
        supportLanguages: ["en", "th"],
        agentProfileIds: ["agent-1"],
        listerIds: ["ignored-by-api"],
        unknown: "drop",
      }),
    ).toEqual({
      minRent: 10000,
      maxRent: 20000,
      bedroomCount: 2,
      bathroomCount: 1,
      contractMonths: 12,
      occupancy: 2,
      buildingType: "Apartment",
      kitchenType: "Separate",
      availableBy: "2026-09-01T17:00:00.000Z",
      isForeignerAccepted: true,
      isTM30Provided: false,
      isCookingAllowed: true,
      isPetAllowed: false,
      buildingFacilities: ["Parking"],
      security: ["CCTV"],
      listingFacilities: ["Aircon"],
      supportLanguages: ["en", "th"],
      agentProfileIds: ["agent-1"],
    })
  })

  it("drops invalid and empty filter values", () => {
    expect(
      parseSavedSearchFilters({
        minRent: "10000",
        maxRent: Number.NaN,
        buildingType: "   ",
        kitchenType: 12,
        availableBy: null,
        isPetAllowed: "yes",
        listingFacilities: [],
        security: [null, 2],
        agentProfileIds: "agent-1",
      }),
    ).toEqual({})
  })

  it("returns empty filters for non-objects", () => {
    expect(parseSavedSearchFilters(null)).toEqual({})
    expect(parseSavedSearchFilters([])).toEqual({})
  })
})

describe("parseSavedSearch", () => {
  it("parses a Waiting area request", () => {
    const parsed = parseSavedSearch(areaSavedSearch)

    expect(parsed).toMatchObject({
      _id: "6a70f2002c0e518d5b689200",
      createdBy: "6a5638bafc6d6328c9e1b281",
      name: "Sukhumvit 2BR",
      description: "Near BTS",
      status: "Waiting",
      isDeleted: false,
      deletedAt: null,
    })
  })

  it("parses an optional matchingCount when present", () => {
    const parsed = parseSavedSearch({
      ...areaSavedSearch,
      matchingCount: 9,
    })

    expect(parsed.matchingCount).toBe(9)
  })

  it.each([undefined, null, "nine", -2] as const)(
    "normalizes invalid matchingCount values to null (%j)",
    (matchingCount) => {
      const parsed = parseSavedSearch({
        ...areaSavedSearch,
        matchingCount,
      })

      expect(parsed.matchingCount).toBeNull()
    },
  )

  it("parses Closed status and soft-delete timestamps", () => {
    const parsed = parseSavedSearch({
      ...areaSavedSearch,
      status: "Closed",
      description: null,
      isDeleted: true,
      deletedAt: "2026-08-04T01:00:00.000Z",
      filters: {},
    })

    expect(parsed.status).toBe("Closed")
    expect(parsed.description).toBeNull()
    expect(parsed.isDeleted).toBe(true)
    expect(parsed.deletedAt).toBe("2026-08-04T01:00:00.000Z")
    expect(parsed.filters).toEqual({})
  })

  it("trims name and coerces missing booleans", () => {
    const parsed = parseSavedSearch({
      ...areaSavedSearch,
      name: "  Trimmed  ",
      isDeleted: "yes",
    })

    expect(parsed.name).toBe("Trimmed")
    expect(parsed.isDeleted).toBe(false)
  })

  it.each([
    ["_id", { _id: "" }],
    ["createdBy", { createdBy: null }],
    ["name", { name: "   " }],
    ["createdAt", { createdAt: 123 }],
    ["updatedAt", { updatedAt: undefined }],
  ])("throws when %s is missing/invalid", (_field, override) => {
    try {
      parseSavedSearch({
        ...areaSavedSearch,
        ...override,
      })
      expect.unreachable("expected parseSavedSearch to throw")
    } catch (error) {
      expect(error).toMatchObject({
        status: 500,
        code: "INVALID_SAVED_SEARCH_RESPONSE",
      })
    }
  })

  it("throws for non-object payloads", () => {
    expect(() => parseSavedSearch(null)).toThrow(ApiError)
    expect(() => parseSavedSearch("saved-search")).toThrow(ApiError)
  })
})

describe("parseGetOwnerSavedSearchByIdResponse", () => {
  it("unwraps a successful Waiting detail payload", () => {
    const parsed = parseGetOwnerSavedSearchByIdResponse({
      success: true,
      data: areaSavedSearch,
    })

    expect(parsed).toEqual({
      success: true,
      data: parseSavedSearch(areaSavedSearch),
    })
  })

  it("unwraps Closed and nearby detail payloads", () => {
    const parsed = parseGetOwnerSavedSearchByIdResponse({
      success: true,
      data: {
        ...areaSavedSearch,
        status: "Closed",
        description: null,
        geoSearch: {
          mode: "nearby",
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 900,
          placeName: null,
        },
        filters: {},
      },
    })

    expect(parsed.data.status).toBe("Closed")
    expect(parsed.data.description).toBeNull()
    expect(parsed.data.geoSearch).toMatchObject({
      mode: "nearby",
      radiusMeters: 900,
      placeName: null,
    })
    expect(parsed.data.filters).toEqual({})
  })

  it.each([
    [{ success: false }],
    [{ success: "true", data: areaSavedSearch }],
    [null],
    ["body"],
    [[]],
    [{ success: true }],
    [{ success: true, data: null }],
    [{ success: true, data: { _id: "broken" } }],
    [{ success: true, data: { ...areaSavedSearch, name: "   " } }],
  ])("throws for invalid detail envelopes (%j)", body => {
    try {
      parseGetOwnerSavedSearchByIdResponse(body)
      expect.unreachable("expected parseGetOwnerSavedSearchByIdResponse to throw")
    } catch (error) {
      expect(error).toMatchObject({
        status: 500,
        code: "INVALID_SAVED_SEARCH_RESPONSE",
      })
    }
  })
})

describe("parseSearchOwnerSavedSearchesResponse", () => {
  it("parses paginated data", () => {
    const parsed = parseSearchOwnerSavedSearchesResponse(
      {
        success: true,
        data: [areaSavedSearch],
        pagination: { page: 1, limit: 20, total: 1 },
      },
      { page: 1, limit: 20 },
    )

    expect(parsed.data).toHaveLength(1)
    expect(parsed.data[0]?.name).toBe("Sukhumvit 2BR")
    expect(parsed.pagination).toEqual({ page: 1, limit: 20, total: 1 })
  })

  it("returns empty data when data is missing or not an array", () => {
    for (const body of [
      { success: true, data: null, pagination: { page: 2, limit: 10, total: 0 } },
      {
        success: true,
        data: undefined,
        pagination: { page: 2, limit: 10, total: 0 },
      },
      { success: true, data: {}, pagination: { page: 2, limit: 10, total: 0 } },
      {
        success: true,
        data: "nope",
        pagination: { page: 2, limit: 10, total: 0 },
      },
      { success: true },
    ]) {
      const parsed = parseSearchOwnerSavedSearchesResponse(body, {
        page: 2,
        limit: 10,
      })

      expect(parsed.data).toEqual([])
    }
  })

  it("falls back pagination fields when response pagination is incomplete", () => {
    expect(
      parseSearchOwnerSavedSearchesResponse(
        {
          success: true,
          data: [],
          pagination: { page: "x", limit: null },
        },
        { page: 3, limit: 15 },
      ).pagination,
    ).toEqual({ page: 3, limit: 15, total: 0 })
  })

  it("throws when one item in the page is malformed", () => {
    expect(() =>
      parseSearchOwnerSavedSearchesResponse(
        {
          success: true,
          data: [areaSavedSearch, { _id: "broken" }],
          pagination: { page: 1, limit: 20, total: 2 },
        },
        { page: 1, limit: 20 },
      ),
    ).toThrow(ApiError)
  })

  it.each([
    [{ success: false }],
    [null],
    ["body"],
    [{ success: "true", data: [] }],
  ])("throws when success envelope is invalid (%j)", body => {
    try {
      parseSearchOwnerSavedSearchesResponse(body, { page: 1, limit: 20 })
      expect.unreachable("expected parseSearchOwnerSavedSearchesResponse to throw")
    } catch (error) {
      expect(error).toMatchObject({
        status: 500,
        code: "INVALID_SAVED_SEARCH_LIST_RESPONSE",
      })
    }
  })
})
