import { describe, expect, it } from "vitest"

import {
  getFilterPillButtonClass,
  getFilterPillOptionKey,
  getFilterPillSizeClass,
  shouldRenderFilterPills,
} from "./filterPillLayout"

describe("filterPillLayout", () => {
  it("uses normal sizing for overlay tabs and compact sizing for default pills", () => {
    expect(getFilterPillSizeClass("overlay")).toContain("h-9")
    expect(getFilterPillSizeClass("default")).toContain("h-8")
  })

  it("builds stable option keys defensively", () => {
    expect(getFilterPillOptionKey({ label: "All", value: undefined }, 0)).toBe(
      "all-All",
    )
    expect(getFilterPillOptionKey({ label: " ", value: "gym" as never }, 1)).toBe(
      "gym-1",
    )
  })

  it("only renders when options exist", () => {
    expect(shouldRenderFilterPills([])).toBe(false)
    expect(shouldRenderFilterPills(null)).toBe(false)
    expect(shouldRenderFilterPills([{ label: "Gym", value: "gym" }])).toBe(true)
  })

  it("applies overlay styling for active and inactive tabs", () => {
    expect(
      getFilterPillButtonClass({
        variant: "overlay",
        isActive: true,
        scrollable: true,
      }),
    ).toContain("bg-slate-900")

    expect(
      getFilterPillButtonClass({
        variant: "overlay",
        isActive: false,
        scrollable: true,
      }),
    ).toContain("bg-white")
  })
})
