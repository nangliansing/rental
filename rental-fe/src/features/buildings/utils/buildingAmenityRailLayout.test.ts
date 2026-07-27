import { describe, expect, it } from "vitest"

import {
  collectBuildingAmenityItems,
  shouldRenderBuildingAmenityRail,
  shouldShowBuildingAmenityRailDivider,
} from "./buildingAmenityRailLayout"

describe("buildingAmenityRailLayout", () => {
  it("collects and normalizes amenity items defensively", () => {
    expect(
      collectBuildingAmenityItems(["Gym", "Gym", " "], [null, "CCTV", 42 as never]),
    ).toEqual(["Gym", "CCTV"])
  })

  it("decides when the rail should render", () => {
    expect(shouldRenderBuildingAmenityRail([], false)).toBe(false)
    expect(shouldRenderBuildingAmenityRail([], true)).toBe(true)
    expect(shouldRenderBuildingAmenityRail(["Lift"], false)).toBe(true)
  })

  it("shows the explore divider only when amenities exist", () => {
    expect(shouldShowBuildingAmenityRailDivider(0, true)).toBe(false)
    expect(shouldShowBuildingAmenityRailDivider(2, true)).toBe(true)
    expect(shouldShowBuildingAmenityRailDivider(2, false)).toBe(false)
  })
})
