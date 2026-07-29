import { renderHook, act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useInView } from "./useInView"

let observerCallback: IntersectionObserverCallback | null = null
let lastObserverOptions: IntersectionObserverInit | undefined
const observe = vi.fn()
const disconnect = vi.fn()

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly thresholds = []

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    observerCallback = callback
    lastObserverOptions = options
  }

  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
  takeRecords = vi.fn(() => [])
}

describe("useInView", () => {
  beforeEach(() => {
    observerCallback = null
    lastObserverOptions = undefined
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reports in-view changes from IntersectionObserver", () => {
    const { result } = renderHook(() => useInView())
    const element = document.createElement("div")

    act(() => {
      result.current.ref(element)
    })

    expect(observe).toHaveBeenCalledWith(element)

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.isInView).toBe(true)

    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.isInView).toBe(false)
  })

  it("passes threshold and rootMargin to IntersectionObserver", () => {
    const { result } = renderHook(() =>
      useInView({ threshold: 0.4, rootMargin: "8px" }),
    )
    const element = document.createElement("div")

    act(() => {
      result.current.ref(element)
    })

    expect(lastObserverOptions).toEqual({
      threshold: 0.4,
      rootMargin: "8px",
    })
  })

  it("forces not in view when disabled and disconnects", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useInView({ enabled }),
      { initialProps: { enabled: true } },
    )
    const element = document.createElement("div")

    act(() => {
      result.current.ref(element)
    })
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.isInView).toBe(true)

    rerender({ enabled: false })
    expect(result.current.isInView).toBe(false)
    expect(disconnect).toHaveBeenCalled()
  })

  it("disconnects the observer on unmount", () => {
    const { result, unmount } = renderHook(() => useInView())
    const element = document.createElement("div")

    act(() => {
      result.current.ref(element)
    })
    expect(observe).toHaveBeenCalled()

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it("re-observes when the observed node changes", () => {
    const { result } = renderHook(() => useInView())
    const first = document.createElement("div")
    const second = document.createElement("div")

    act(() => {
      result.current.ref(first)
    })
    expect(observe).toHaveBeenCalledWith(first)

    act(() => {
      result.current.ref(second)
    })

    expect(disconnect).toHaveBeenCalled()
    expect(observe).toHaveBeenLastCalledWith(second)
  })

  it("treats missing IntersectionObserver as in view", () => {
    vi.stubGlobal("IntersectionObserver", undefined)

    const { result } = renderHook(() => useInView())
    const element = document.createElement("div")

    act(() => {
      result.current.ref(element)
    })

    expect(result.current.isInView).toBe(true)
  })

  it("starts observing once a callback ref receives a mounted node", () => {
    function Probe() {
      const { ref, isInView } = useInView({ threshold: 0.4 })
      return <div ref={ref} data-in-view={isInView ? "yes" : "no"} />
    }

    render(<Probe />)
    const node = document.querySelector("[data-in-view]") as HTMLElement
    expect(node).toHaveAttribute("data-in-view", "no")
    expect(observe).toHaveBeenCalledWith(node)

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(node).toHaveAttribute("data-in-view", "yes")
  })
})
