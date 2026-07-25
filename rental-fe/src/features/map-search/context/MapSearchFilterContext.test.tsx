import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { SearchAgentProfile } from "@/features/agent"

import {
  FILTER_REMOVAL_DEBOUNCE_MS,
  useMapSearchFilterState,
} from "./MapSearchFilterContext"

describe("useMapSearchFilterState", () => {
  it("submits explicitly applied filters in the same state transition", () => {
    const onFiltersChanged = vi.fn()
    const { result } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() => {
      result.current.applyFilters({ minRent: 4500, bedroomCount: 1 })
    })

    expect(result.current.filters).toEqual({
      minRent: 4500,
      bedroomCount: 1,
    })
    expect(result.current.submittedFilters).toEqual(result.current.filters)
    expect(onFiltersChanged).toHaveBeenCalledTimes(1)
  })

  it("updates a removed chip immediately and submits it after the debounce", () => {
    vi.useFakeTimers()
    const onFiltersChanged = vi.fn()
    const { result, unmount } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() => result.current.applyFilters({ minRent: 2000, isPetAllowed: true }))
    onFiltersChanged.mockClear()
    act(() =>
      result.current.removeFilter({ key: "isPetAllowed", label: "Pets" }),
    )

    expect(result.current.filters).toEqual({ minRent: 2000 })
    expect(result.current.submittedFilters).toEqual({
      minRent: 2000,
      isPetAllowed: true,
    })
    expect(onFiltersChanged).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS))
    expect(result.current.submittedFilters).toEqual({ minRent: 2000 })
    expect(onFiltersChanged).toHaveBeenCalledTimes(1)
    unmount()
    vi.useRealTimers()
  })

  it("coalesces rapid chip removals into one submitted search state", () => {
    vi.useFakeTimers()
    const onFiltersChanged = vi.fn()
    const { result, unmount } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() =>
      result.current.applyFilters({
        minRent: 2000,
        isPetAllowed: true,
        isCookingAllowed: true,
        isTM30Provided: true,
      }),
    )
    onFiltersChanged.mockClear()

    act(() => {
      result.current.removeFilter({ key: "isPetAllowed", label: "Pets" })
      vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS - 100)
      result.current.removeFilter({ key: "isCookingAllowed", label: "Cooking" })
      vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS - 100)
      result.current.removeFilter({ key: "isTM30Provided", label: "TM30" })
    })

    expect(result.current.filters).toEqual({ minRent: 2000 })
    expect(onFiltersChanged).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS))
    expect(result.current.submittedFilters).toEqual({ minRent: 2000 })
    expect(onFiltersChanged).toHaveBeenCalledTimes(1)
    unmount()
    vi.useRealTimers()
  })

  it("lets an explicit Apply or Clear replace a pending removal", () => {
    vi.useFakeTimers()
    const onFiltersChanged = vi.fn()
    const { result, unmount } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() =>
      result.current.applyFilters({ minRent: 2000, isPetAllowed: true }),
    )
    onFiltersChanged.mockClear()
    act(() =>
      result.current.removeFilter({ key: "isPetAllowed", label: "Pets" }),
    )
    act(() => result.current.applyFilters({}))
    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS * 2))

    expect(result.current.submittedFilters).toEqual({})
    expect(onFiltersChanged).toHaveBeenCalledTimes(1)
    unmount()
    vi.useRealTimers()
  })

  it("does not submit a pending removal after unmount", () => {
    vi.useFakeTimers()
    const onFiltersChanged = vi.fn()
    const { result, unmount } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() =>
      result.current.applyFilters({ minRent: 2000, isPetAllowed: true }),
    )
    onFiltersChanged.mockClear()
    act(() =>
      result.current.removeFilter({ key: "isPetAllowed", label: "Pets" }),
    )
    unmount()
    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS * 2))

    expect(onFiltersChanged).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("submits an empty filter set when all filters are cleared", () => {
    const onFiltersChanged = vi.fn()
    const { result } = renderHook(() =>
      useMapSearchFilterState({ onFiltersChanged }),
    )

    act(() => {
      result.current.applyFilters({ minRent: 3000, isPetAllowed: true })
    })
    act(() => result.current.applyFilters({}))

    expect(result.current.filters).toEqual({})
    expect(result.current.submittedFilters).toEqual({})
    expect(onFiltersChanged).toHaveBeenCalledTimes(2)
  })

  it("keeps debounced lister filters synchronized without duplicates", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMapSearchFilterState())
    const lister = { _id: "agent-1" } as SearchAgentProfile

    act(() => result.current.toggleLister(lister))
    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS))
    expect(result.current.submittedFilters.agentProfileIds).toEqual([
      "agent-1",
    ])

    act(() => result.current.toggleLister(lister))
    act(() => vi.advanceTimersByTime(FILTER_REMOVAL_DEBOUNCE_MS))
    expect(result.current.submittedFilters.agentProfileIds).toBeUndefined()
    vi.useRealTimers()
  })
})
