import { describe, expect, it } from "vitest"

import {
  isPositionInsideMapCameraBounds,
} from "./map-camera"

describe("isPositionInsideMapCameraBounds", () => {
  const bounds = {
    north: 13.8,
    south: 13.7,
    east: 100.7,
    west: 100.6,
  }

  it("returns false when bounds are missing", () => {
    expect(
      isPositionInsideMapCameraBounds({ lat: 13.75, lng: 100.65 }, null),
    ).toBe(false)
  })

  it("returns true when the position is inside the bounds", () => {
    expect(
      isPositionInsideMapCameraBounds({ lat: 13.75, lng: 100.65 }, bounds),
    ).toBe(true)
  })

  it("returns true when the position is on the bounds edge", () => {
    expect(
      isPositionInsideMapCameraBounds({ lat: 13.8, lng: 100.7 }, bounds),
    ).toBe(true)
  })

  it("returns false when the position is outside the bounds", () => {
    expect(
      isPositionInsideMapCameraBounds({ lat: 13.65, lng: 100.65 }, bounds),
    ).toBe(false)
  })
})
