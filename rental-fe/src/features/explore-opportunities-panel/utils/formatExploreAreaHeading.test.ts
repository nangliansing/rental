import { describe, expect, it } from "vitest"

import { formatExploreAreaHeading } from "./formatExploreAreaHeading"

describe("formatExploreAreaHeading", () => {
  it("prefers a place name over generic snapshot titles", () => {
    expect(
      formatExploreAreaHeading({
        areaTitle: "Bang Kapi",
        previewGeo: {
          kind: "area",
          bounds: {
            northEast: { lat: 13.8, lng: 100.6 },
            southWest: { lat: 13.7, lng: 100.5 },
          },
        },
      }),
    ).toBe("Bang Kapi")
  })

  it("humanizes generic snapshot titles by map shape", () => {
    expect(
      formatExploreAreaHeading({
        areaTitle: "Visible map area",
        previewGeo: {
          kind: "area",
          bounds: {
            northEast: { lat: 13.8, lng: 100.6 },
            southWest: { lat: 13.7, lng: 100.5 },
          },
        },
      }),
    ).toBe("This map area")

    expect(
      formatExploreAreaHeading({
        areaTitle: "Pinned location",
        previewGeo: {
          kind: "circle",
          center: { lat: 13.7, lng: 100.5 },
          radiusMeters: 1000,
        },
      }),
    ).toBe("Around this pin")

    expect(
      formatExploreAreaHeading({
        areaTitle: "Search line",
        previewGeo: {
          kind: "line",
          paths: [
            [
              { lat: 13.7, lng: 100.5 },
              { lat: 13.8, lng: 100.6 },
            ],
          ],
          distanceMeters: 500,
        },
      }),
    ).toBe("Along this line")
  })
})
