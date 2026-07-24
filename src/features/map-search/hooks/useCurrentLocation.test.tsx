import { act, renderHook } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCurrentLocation } from "./useCurrentLocation"

type SuccessCallback = PositionCallback
type ErrorCallback = PositionErrorCallback

describe("useCurrentLocation", () => {
  const originalGeolocation = navigator.geolocation
  let successCallback: SuccessCallback
  let errorCallback: ErrorCallback
  const getCurrentPosition = vi.fn(
    (onSuccess: SuccessCallback, onError?: ErrorCallback | null) => {
      successCallback = onSuccess
      errorCallback = onError ?? vi.fn()
    },
  )

  beforeEach(() => {
    vi.useFakeTimers()
    getCurrentPosition.mockClear()
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: originalGeolocation,
    })
  })

  it("requests a one-time, bounded location and returns coordinates", () => {
    const onLocated = vi.fn()
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.requestLocation(onLocated))

    expect(result.current.status).toBe("locating")
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    )

    act(() =>
      successCallback({
        coords: { latitude: 13.75, longitude: 100.5 },
      } as GeolocationPosition),
    )

    expect(onLocated).toHaveBeenCalledWith({ lat: 13.75, lng: 100.5 })
    expect(result.current.status).toBe("success")
  })

  it("suppresses repeated requests while locating", () => {
    const { result } = renderHook(() => useCurrentLocation())

    act(() => {
      result.current.requestLocation(vi.fn())
      result.current.requestLocation(vi.fn())
    })

    expect(getCurrentPosition).toHaveBeenCalledOnce()
  })

  it("recovers when the browser leaves permission unresolved", () => {
    const onLocated = vi.fn()
    const { result } = renderHook(() => useCurrentLocation())
    act(() => result.current.requestLocation(onLocated))

    act(() => vi.advanceTimersByTime(20_000))

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe(
      "Location permission is taking too long. Try again.",
    )

    act(() =>
      successCallback({
        coords: { latitude: 13.75, longitude: 100.5 },
      } as GeolocationPosition),
    )
    expect(onLocated).not.toHaveBeenCalled()
  })

  it.each([
    [1, "Location permission was denied. Allow location access and try again."],
    [3, "Finding your location took too long. Try again."],
    [2, "Your location is currently unavailable. Try again."],
  ])("maps geolocation error %i to a useful message", (code, message) => {
    const { result } = renderHook(() => useCurrentLocation())
    act(() => result.current.requestLocation(vi.fn()))

    act(() =>
      errorCallback({
        code,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError),
    )

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe(message)
  })

  it("reports unsupported browsers without making a request", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    })
    const { result } = renderHook(() => useCurrentLocation())

    act(() => result.current.requestLocation(vi.fn()))

    expect(result.current.error).toBe(
      "Location is not supported by this browser.",
    )
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("ignores a successful callback after unmount", () => {
    const onLocated = vi.fn()
    const { result, unmount } = renderHook(() => useCurrentLocation())
    act(() => result.current.requestLocation(onLocated))

    unmount()
    successCallback({
      coords: { latitude: 13.75, longitude: 100.5 },
    } as GeolocationPosition)

    expect(onLocated).not.toHaveBeenCalled()
  })

  it("accepts callbacks after the Strict Mode effect replay", () => {
    const onLocated = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    )
    const { result } = renderHook(() => useCurrentLocation(), { wrapper })
    act(() => result.current.requestLocation(onLocated))

    act(() =>
      successCallback({
        coords: { latitude: 13.75, longitude: 100.5 },
      } as GeolocationPosition),
    )

    expect(onLocated).toHaveBeenCalledWith({ lat: 13.75, lng: 100.5 })
    expect(result.current.status).toBe("success")
  })
})
