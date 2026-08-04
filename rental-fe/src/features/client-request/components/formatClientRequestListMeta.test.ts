import { describe, expect, it } from "vitest"

import {
  formatClientRequestGeoPreview,
  formatClientRequestListPreview,
  formatClientRequestListTimestamp,
} from "./formatClientRequestListMeta"

describe("formatClientRequestGeoPreview", () => {
  it("prefers placeName when present", () => {
    expect(
      formatClientRequestGeoPreview({
        mode: "area",
        placeName: "  Phrom Phong  ",
      }),
    ).toBe("Phrom Phong")
  })

  it("falls back to mode labels", () => {
    expect(formatClientRequestGeoPreview({ mode: "nearby" })).toBe(
      "Nearby pin",
    )
    expect(formatClientRequestGeoPreview({ mode: "line" })).toBe("Search line")
    expect(formatClientRequestGeoPreview({ mode: "area" })).toBe("Map area")
  })
})

describe("formatClientRequestListPreview", () => {
  it("prefers description over geo summary", () => {
    expect(
      formatClientRequestListPreview({
        description: "  Near BTS  ",
        geoSearch: { mode: "area", placeName: "Phrom Phong" },
      }),
    ).toBe("Near BTS")
  })

  it("uses geo preview when description is empty", () => {
    expect(
      formatClientRequestListPreview({
        description: null,
        geoSearch: { mode: "area", placeName: "Siam" },
      }),
    ).toBe("Siam")
  })
})

describe("formatClientRequestListTimestamp", () => {
  const now = new Date(2026, 7, 4, 15, 0, 0, 0)

  it("formats same-day times", () => {
    const sameDay = new Date(2026, 7, 4, 8, 5, 0, 0).toISOString()
    expect(formatClientRequestListTimestamp(sameDay, now)).toMatch(/\d/)
  })

  it("labels yesterday", () => {
    const yesterday = new Date(2026, 7, 3, 12, 0, 0, 0).toISOString()
    expect(formatClientRequestListTimestamp(yesterday, now)).toBe("Yesterday")
  })

  it("formats earlier dates in the same year", () => {
    const earlier = new Date(2026, 2, 15, 12, 0, 0, 0).toISOString()
    expect(formatClientRequestListTimestamp(earlier, now)).toMatch(/Mar/)
  })
})
