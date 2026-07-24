import { describe, expect, it } from "vitest"

import { buildGoogleMapsDirectionsUrl } from "./buildGoogleMapsDirectionsUrl"

describe("buildGoogleMapsDirectionsUrl", () => {
  it("builds a Google Maps directions URL from GeoJSON coordinates", () => {
    expect(
      buildGoogleMapsDirectionsUrl({ coordinates: [100.6435, 13.7654] }),
    ).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
    )
  })

  it.each([
    undefined,
    null,
    {},
    { coordinates: [] },
    { coordinates: [100] },
    { coordinates: [181, 13] },
    { coordinates: [100, 91] },
    { coordinates: [Number.NaN, 13] },
    { coordinates: ["", "13"] },
  ])("rejects an invalid destination: %o", (destination) => {
    expect(buildGoogleMapsDirectionsUrl(destination)).toBeNull()
  })

  it("accepts finite numeric strings defensively", () => {
    expect(
      buildGoogleMapsDirectionsUrl({ coordinates: ["100.5", "13.7"] }),
    ).toContain("destination=13.7%2C100.5")
  })
})
