import { describe, expect, it } from "vitest"

import {
  formatSavedSearchGeoPreview,
  formatSavedSearchListPreview,
  formatSavedSearchListTimestamp,
  formatCappedSavedSearchMatchingTotal,
} from "./formatSavedSearchListMeta"

describe("formatSavedSearchGeoPreview", () => {
  it("prefers placeName when present", () => {
    expect(
      formatSavedSearchGeoPreview({
        mode: "area",
        placeName: "  Phrom Phong  ",
      }),
    ).toBe("Phrom Phong")
  })

  it("falls back to mode labels", () => {
    expect(formatSavedSearchGeoPreview({ mode: "nearby" })).toBe(
      "Nearby pin",
    )
    expect(formatSavedSearchGeoPreview({ mode: "line" })).toBe("Search line")
    expect(formatSavedSearchGeoPreview({ mode: "area" })).toBe("Map area")
  })
})

describe("formatSavedSearchListPreview", () => {
  it("prefers description over geo summary", () => {
    expect(
      formatSavedSearchListPreview({
        description: "  Near BTS  ",
        geoSearch: { mode: "area", placeName: "Phrom Phong" },
      }),
    ).toBe("Near BTS")
  })

  it("uses geo preview when description is empty", () => {
    expect(
      formatSavedSearchListPreview({
        description: null,
        geoSearch: { mode: "area", placeName: "Siam" },
      }),
    ).toBe("Siam")
  })
})

describe("formatSavedSearchListTimestamp", () => {
  const now = new Date(2026, 7, 4, 15, 0, 0, 0)

  it("formats same-day times", () => {
    const sameDay = new Date(2026, 7, 4, 8, 5, 0, 0).toISOString()
    expect(formatSavedSearchListTimestamp(sameDay, now)).toMatch(/\d/)
  })

  it("labels yesterday", () => {
    const yesterday = new Date(2026, 7, 3, 12, 0, 0, 0).toISOString()
    expect(formatSavedSearchListTimestamp(yesterday, now)).toBe("Yesterday")
  })

  it("formats earlier dates in the same year", () => {
    const earlier = new Date(2026, 2, 15, 12, 0, 0, 0).toISOString()
    expect(formatSavedSearchListTimestamp(earlier, now)).toMatch(/Mar/)
  })
})

describe("formatCappedSavedSearchMatchingTotal", () => {
  it("shows the backend lower bound for a truncated sample", () => {
    expect(formatCappedSavedSearchMatchingTotal(4, 16)).toBe("20+ total")
  })

  it("defensively preserves a larger sampled total", () => {
    expect(formatCappedSavedSearchMatchingTotal(12, 14)).toBe("26+ total")
  })
})
