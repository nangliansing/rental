import { describe, expect, it, vi } from "vitest"

import {
  focusMapOnPlace,
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

describe("focusMapOnPlace", () => {
  it("uses viewport when available", () => {
    const fitBounds = vi.fn()
    const panTo = vi.fn()
    const setZoom = vi.fn()
    const viewport = {} as google.maps.LatLngBounds
    const map = { fitBounds, panTo, setZoom } as unknown as google.maps.Map

    focusMapOnPlace(map, { lat: 13.7, lng: 100.6 }, viewport)

    expect(fitBounds).toHaveBeenCalledWith(viewport)
    expect(panTo).not.toHaveBeenCalled()
  })

  it("pans and zooms when viewport is missing", () => {
    const fitBounds = vi.fn()
    const panTo = vi.fn()
    const setZoom = vi.fn()
    const map = { fitBounds, panTo, setZoom } as unknown as google.maps.Map

    focusMapOnPlace(map, { lat: 13.7, lng: 100.6 })

    expect(fitBounds).not.toHaveBeenCalled()
    expect(panTo).toHaveBeenCalledWith({ lat: 13.7, lng: 100.6 })
    expect(setZoom).toHaveBeenCalledWith(15)
  })
})
