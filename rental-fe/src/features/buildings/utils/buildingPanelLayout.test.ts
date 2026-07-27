import { describe, expect, it } from "vitest"

import {
  getBuildingPanelContainerClass,
  getBuildingPanelSurfaceClass,
  normalizeBuildingPanelBreakout,
} from "./buildingPanelLayout"

describe("buildingPanelLayout", () => {
  it("applies inset breakout only for panel layouts", () => {
    expect(getBuildingPanelContainerClass("inset")).toContain("-mx-4")
    expect(getBuildingPanelContainerClass("flush")).not.toContain("-mx-4")
  })

  it("normalizes unknown breakout values to inset", () => {
    expect(normalizeBuildingPanelBreakout("flush")).toBe("flush")
    expect(normalizeBuildingPanelBreakout("inset")).toBe("inset")
    expect(normalizeBuildingPanelBreakout(undefined)).toBe("inset")
    expect(normalizeBuildingPanelBreakout("wide")).toBe("inset")
  })

  it("merges optional surface classes", () => {
    expect(getBuildingPanelSurfaceClass("w-full")).toContain("bg-white")
    expect(getBuildingPanelSurfaceClass("w-full")).toContain("w-full")
  })
})
