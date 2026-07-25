import { describe, expect, it } from "vitest"

import { buildLineCoveragePolygon } from "./line-coverage"

describe("buildLineCoveragePolygon", () => {
  it("builds both sides of a line corridor", () => {
    const polygon = buildLineCoveragePolygon(
      [
        { lat: 13.7, lng: 100.6 },
        { lat: 13.71, lng: 100.61 },
        { lat: 13.72, lng: 100.6 },
      ],
      500,
    )

    expect(polygon).toHaveLength(6)
    expect(polygon.every(({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng))).toBe(true)
  })

  it("requires a valid line and positive distance", () => {
    expect(buildLineCoveragePolygon([{ lat: 1, lng: 2 }], 500)).toEqual([])
    expect(
      buildLineCoveragePolygon(
        [
          { lat: 1, lng: 2 },
          { lat: 2, lng: 3 },
        ],
        0,
      ),
    ).toEqual([])
  })
})
