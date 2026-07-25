import { describe, expect, it } from "vitest"

import {
  getBuildingMarkerClassName,
  getProminentBuildings,
} from "./BuildingMarkerLayer"

const buildings = [
  { _id: "a", name: "A", location: { type: "Point", coordinates: [100, 13] }, listings: [] },
  { _id: "b", name: "B", location: { type: "Point", coordinates: [100.1, 13.1] }, listings: [] },
] as never

describe("getBuildingMarkerClassName", () => {
  it("uses black active styling for selected and hovered markers", () => {
    const selected = getBuildingMarkerClassName({ isSelected: true })
    const hovered = getBuildingMarkerClassName({ isHovered: true })
    const defaultMarker = getBuildingMarkerClassName({})

    expect(selected).toContain("bg-slate-950")
    expect(selected).toContain("scale-110")
    expect(hovered).toContain("bg-slate-950")
    expect(defaultMarker).toContain("bg-white")
  })
})

describe("getProminentBuildings", () => {
  it("returns selected and hovered buildings outside the cluster layer", () => {
    expect(
      getProminentBuildings({
        buildings,
        selectedBuildingId: "a",
        hoveredBuildingId: "b",
      }).map((building) => building._id),
    ).toEqual(["a", "b"])
  })

  it("deduplicates when the same building is selected and hovered", () => {
    expect(
      getProminentBuildings({
        buildings,
        selectedBuildingId: "a",
        hoveredBuildingId: "a",
      }).map((building) => building._id),
    ).toEqual(["a"])
  })
})
