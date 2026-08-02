import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  parseBuildingLocation,
  parseListingMedia,
  parseSearchListing,
  readNumber,
  readString,
  readStringArray,
} from "./listingResponseParsers"

describe("listingResponseParsers", () => {
  it("readString returns fallback for invalid values", () => {
    expect(readString(null, "fallback")).toBe("fallback")
    expect(readString(42, "fallback")).toBe("fallback")
    expect(readString("hello")).toBe("hello")
  })

  it("readNumber rejects non-finite numbers", () => {
    expect(readNumber(Number.NaN)).toBeNull()
    expect(readNumber("12")).toBeNull()
    expect(readNumber(12, 0)).toBe(12)
  })

  it("readStringArray filters non-string entries", () => {
    expect(readStringArray(["Lift", 1, null, "Parking"])).toEqual([
      "Lift",
      "Parking",
    ])
    expect(readStringArray(null)).toEqual([])
  })

  it("parseBuildingLocation defaults invalid coordinates to zero", () => {
    expect(parseBuildingLocation(null)).toEqual({
      type: "Point",
      coordinates: [0, 0],
    })
    expect(
      parseBuildingLocation({
        coordinates: ["100.5", 13.7],
      }),
    ).toEqual({
      type: "Point",
      coordinates: [0, 13.7],
    })
  })

  it("parseListingMedia rejects incomplete media", () => {
    expect(parseListingMedia({ publicId: "id-only" })).toBeNull()
    expect(
      parseListingMedia({
        publicId: "photo-1",
        secureUrl: "https://example.com/photo.jpg",
      }),
    ).toMatchObject({
      publicId: "photo-1",
      secureUrl: "https://example.com/photo.jpg",
      resourceType: "image",
    })
  })

  it("parseSearchListing throws when required listing fields are missing", () => {
    expect(() => parseSearchListing({})).toThrow(ApiError)
  })

  it("parseSearchListing normalizes listing and building data", () => {
    const parsed = parseSearchListing({
      _id: "listing-1",
      listedBy: "agent-1",
      buildingId: "building-1",
      visibility: "PRIVATE",
      rent: "9000",
      availableAt: "2026-08-15T00:00:00+07:00",
      building: {
        _id: "building-1",
        name: "Sample Residence",
        location: {
          coordinates: [100.5, 13.7],
        },
      },
    })

    expect(parsed._id).toBe("listing-1")
    expect(parsed.visibility).toBe("PRIVATE")
    expect(parsed.rent).toBe(0)
    expect(parsed.availableAt).toBe("2026-08-14T17:00:00.000Z")
    expect(parsed.building.name).toBe("Sample Residence")
    expect(parsed.building.location.coordinates).toEqual([100.5, 13.7])
  })

  it("parseSearchListing defaults missing availableAt to null", () => {
    const parsed = parseSearchListing({
      _id: "listing-1",
      listedBy: "agent-1",
      buildingId: "building-1",
      building: {
        _id: "building-1",
        name: "Sample Residence",
        location: {
          coordinates: [100.5, 13.7],
        },
      },
    })

    expect(parsed.availableAt).toBeNull()
  })

  it("parseSearchListing keeps privateNote optional for owner detail responses", () => {
    const withoutNote = parseSearchListing({
      _id: "listing-1",
      listedBy: "agent-1",
      buildingId: "building-1",
      building: {
        _id: "building-1",
        name: "Sample Residence",
        location: { coordinates: [100.5, 13.7] },
      },
    })

    expect(withoutNote.privateNote).toBeUndefined()

    const withNote = parseSearchListing({
      _id: "listing-1",
      listedBy: "agent-1",
      buildingId: "building-1",
      privateNote: "  Call before viewing  ",
      building: {
        _id: "building-1",
        name: "Sample Residence",
        location: { coordinates: [100.5, 13.7] },
      },
    })

    expect(withNote.privateNote).toBe("  Call before viewing  ")

    const clearedNote = parseSearchListing({
      _id: "listing-1",
      listedBy: "agent-1",
      buildingId: "building-1",
      privateNote: null,
      building: {
        _id: "building-1",
        name: "Sample Residence",
        location: { coordinates: [100.5, 13.7] },
      },
    })

    expect(clearedNote.privateNote).toBeNull()
  })
})
