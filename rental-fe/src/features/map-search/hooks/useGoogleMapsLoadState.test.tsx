import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useGoogleMapsLoadState } from "./useGoogleMapsLoadState"

describe("useGoogleMapsLoadState", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.gm_authFailure = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
    window.gm_authFailure = undefined
  })

  it("reports missing configuration immediately", () => {
    const { result } = renderHook(() => useGoogleMapsLoadState(false))

    expect(result.current.status).toBe("error")
  })

  it("moves from loading to ready after the script loads", () => {
    const { result } = renderHook(() => useGoogleMapsLoadState(true))

    expect(result.current.status).toBe("loading")

    act(() => result.current.markReady())
    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.status).toBe("ready")
  })

  it("handles Google authentication failures after script load", () => {
    const previousHandler = vi.fn()
    window.gm_authFailure = previousHandler
    const { result } = renderHook(() => useGoogleMapsLoadState(true))

    act(() => result.current.markReady())
    act(() => window.gm_authFailure?.())

    expect(previousHandler).toHaveBeenCalledOnce()
    expect(result.current.status).toBe("error")
  })

  it("fails cleanly when loading times out", () => {
    const { result } = renderHook(() => useGoogleMapsLoadState(true))

    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.status).toBe("error")
  })

  it("restores an existing authentication handler on unmount", () => {
    const previousHandler = vi.fn()
    window.gm_authFailure = previousHandler
    const { unmount } = renderHook(() => useGoogleMapsLoadState(true))

    unmount()

    expect(window.gm_authFailure).toBe(previousHandler)
  })
})
