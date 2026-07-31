import { describe, expect, it } from "vitest"

import {
  formatBuildingSummaryRent,
  getBuildingSummaryCoordinates,
  normalizeBuildingId,
  getBuildingDetailPath,
  normalizeBuildingSummary,
  normalizeOptionalText,
  normalizeRent,
  normalizeStringArray,
} from "./buildingSummaryDisplay"

describe("buildingSummaryDisplay", () => {
  it("normalizes partial building data defensively", () => {
    expect(
      normalizeBuildingSummary({
        name: "  Bangkapi Residence  ",
        buildingType: " ",
        address: null,
        facilities: ["Parking", "Parking", " ", 42] as never,
        security: null,
        minRent: -1,
        maxRent: Number.NaN,
        _id: " building-1 ",
      }),
    ).toEqual({
      id: "building-1",
      name: "Bangkapi Residence",
      buildingType: null,
      address: null,
      facilities: ["Parking"],
      security: [],
      minRent: null,
      maxRent: null,
      coordinates: null,
    })
  })

  it("builds a shareable building detail path", () => {
    expect(getBuildingDetailPath("building-1")).toBe("/buildings/building-1")
    expect(getBuildingDetailPath("  building 2  ")).toBe("/buildings/building%202")
    expect(getBuildingDetailPath("")).toBeNull()
    expect(getBuildingDetailPath(null)).toBeNull()
  })

  it("falls back to a safe building name and clamps invalid rent ranges", () => {
    expect(
      normalizeBuildingSummary({
        name: "   ",
        minRent: 12_000,
        maxRent: 8_000,
      }),
    ).toEqual({
      id: "",
      name: "Building",
      buildingType: null,
      address: null,
      facilities: [],
      security: [],
      minRent: 12_000,
      maxRent: 12_000,
      coordinates: null,
    })
  })

  it("includes coordinates only when requested and valid", () => {
    expect(
      normalizeBuildingSummary(
        {
          name: "Residence",
          location: { coordinates: [100.642, 13.7653] },
        },
        { showCoordinates: true },
      ).coordinates,
    ).toEqual({ lat: 13.7653, lng: 100.642 })

    expect(
      normalizeBuildingSummary(
        {
          name: "Residence",
          location: { coordinates: [100.642, 13.7653] },
        },
        { showCoordinates: false },
      ).coordinates,
    ).toBeNull()
  })

  it("formats rent ranges and empty rent labels", () => {
    expect(formatBuildingSummaryRent(null, null)).toBe("No rent yet")
    expect(formatBuildingSummaryRent(5_000, null)).toBe("฿5k+")
    expect(formatBuildingSummaryRent(5_000, 5_000)).toBe("฿5k+")
    expect(formatBuildingSummaryRent(5_000, 8_000)).toBe("฿5k - ฿8k")
  })

  it("rejects invalid coordinates", () => {
    expect(
      getBuildingSummaryCoordinates({
        coordinates: [200, 13.7],
      }),
    ).toBeNull()
    expect(getBuildingSummaryCoordinates(null)).toBeNull()
    expect(getBuildingSummaryCoordinates({ coordinates: [100, "bad"] as never })).toBeNull()
  })

  it("normalizes helper primitives", () => {
    expect(normalizeOptionalText("  hello ")).toBe("hello")
    expect(normalizeOptionalText("")).toBeNull()
    expect(normalizeOptionalText(undefined)).toBeNull()
    expect(normalizeRent(0)).toBe(0)
    expect(normalizeRent(-1)).toBeNull()
    expect(normalizeBuildingId("  id-1 ")).toBe("id-1")
    expect(
      normalizeStringArray([" Gym ", "Gym", "Pool", "", null, 1]),
    ).toEqual(["Gym", "Pool"])
  })
})
