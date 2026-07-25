import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMapCameraTransition } from "./useMapCameraTransition"

function createMap() {
  return {
    getCenter: vi.fn(() => ({ lat: () => 13, lng: () => 100 })),
    getZoom: vi.fn(() => 12),
    moveCamera: vi.fn(),
  } as unknown as google.maps.Map
}

describe("useMapCameraTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("smoothly moves the camera to the requested destination", () => {
    const map = createMap()
    const { result } = renderHook(() => useMapCameraTransition(map))

    act(() => result.current.flyTo({ lat: 14, lng: 101 }, 16))
    expect(result.current.isMoving).toBe(true)

    act(() => vi.advanceTimersByTime(700))

    expect(map.moveCamera).toHaveBeenLastCalledWith({
      center: { lat: 14, lng: 101 },
      zoom: 16,
    })
    expect(result.current.isMoving).toBe(false)
  })

  it("cancels the previous movement when a new one starts", () => {
    const map = createMap()
    const { result } = renderHook(() => useMapCameraTransition(map))

    act(() => {
      result.current.flyTo({ lat: 14, lng: 101 }, 16)
      result.current.flyTo({ lat: 15, lng: 102 }, 17)
      vi.advanceTimersByTime(700)
    })

    expect(map.moveCamera).toHaveBeenLastCalledWith({
      center: { lat: 15, lng: 102 },
      zoom: 17,
    })
  })

  it("moves immediately when reduced motion is preferred", () => {
    vi.mocked(matchMedia).mockReturnValue({ matches: true } as MediaQueryList)
    const map = createMap()
    const { result } = renderHook(() => useMapCameraTransition(map))

    act(() => result.current.flyTo({ lat: 14, lng: 101 }, 16))

    expect(map.moveCamera).toHaveBeenCalledOnce()
    expect(result.current.isMoving).toBe(false)
  })
})
