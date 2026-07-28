import { describe, expect, it } from "vitest"

import { buildFilterChips } from "./buildFilterChips"
import { removeFilterChip } from "./removeFilterChip"

describe("availableBy filter chips", () => {
  it("builds a readable chip for availableBy", () => {
    expect(
      buildFilterChips({ availableBy: "2026-08-15" }),
    ).toEqual([
      {
        key: "availableBy",
        label: "By Aug 15, 2026",
      },
    ])
  })

  it("falls back when availableBy is present but unformatable", () => {
    expect(
      buildFilterChips({ availableBy: "not-a-date" }),
    ).toEqual([
      {
        key: "availableBy",
        label: "Available by date",
      },
    ])
  })

  it("removes availableBy without touching other filters", () => {
    expect(
      removeFilterChip(
        { availableBy: "2026-08-15", minRent: 5000 },
        { key: "availableBy", label: "By Aug 15, 2026" },
      ),
    ).toEqual({ minRent: 5000 })
  })
})
