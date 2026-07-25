import { describe, expect, it } from "vitest"

import {
  getDirectionsConfirmDescription,
  getDirectionsTriggerLabel,
  normalizeDirectionsDestination,
  resolveDirectionsAction,
} from "./directionsDisplay"

describe("directionsDisplay", () => {
  it("normalizes destination labels and rejects invalid coordinates", () => {
    expect(
      normalizeDirectionsDestination({
        name: "  Tower  ",
        coordinates: [100.6435, 13.7654],
      }),
    ).toEqual({
      name: "Tower",
      coordinates: [100.6435, 13.7654],
    })

    expect(
      normalizeDirectionsDestination({
        name: "Tower",
        coordinates: [999, 999],
      }),
    ).toBeNull()
  })

  it("resolves directions action state defensively", () => {
    expect(
      resolveDirectionsAction({
        name: "Bangkapi Residence",
        coordinates: [100.6435, 13.7654],
      }),
    ).toMatchObject({
      destinationLabel: "Bangkapi Residence",
      hasDirections: true,
      directionsUrl:
        "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
    })
  })

  it("builds accessible labels and confirm copy", () => {
    expect(getDirectionsTriggerLabel("Tower")).toBe("Get directions to Tower")
    expect(getDirectionsTriggerLabel(null)).toBe("Get directions")
    expect(getDirectionsConfirmDescription("Tower")).toContain("Tower")
    expect(getDirectionsConfirmDescription(null)).toContain("this building")
  })
})
