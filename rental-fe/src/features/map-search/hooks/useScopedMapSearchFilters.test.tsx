import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useScopedMapSearchFilters } from "./useScopedMapSearchFilters"

describe("useScopedMapSearchFilters", () => {
  it("commits filter changes only to the active query scope", () => {
    const initialFilters = { minRent: 1000 }
    const { result } = renderHook(() =>
      useScopedMapSearchFilters({ initialFilters }),
    )

    act(() =>
      result.current.commitFilters("building-detail", {
        minRent: 5000,
        isPetAllowed: true,
      }),
    )

    expect(result.current.buildingDetailFilters).toEqual({
      minRent: 5000,
      isPetAllowed: true,
    })
    expect(result.current.buildingListFilters).toEqual(initialFilters)

    act(() => result.current.enterBuildingList({ minRent: 5000 }))
    expect(result.current.buildingListFilters).toEqual({ minRent: 5000 })
    expect(result.current.buildingDetailFilters).toEqual({
      minRent: 5000,
      isPetAllowed: true,
    })
  })

  it("synchronizes current filters when entering building details", () => {
    const { result } = renderHook(() =>
      useScopedMapSearchFilters({ initialFilters: {} }),
    )

    act(() =>
      result.current.commitFilters("building-list", { maxRent: 8000 }),
    )
    act(() =>
      result.current.enterBuildingDetail({ maxRent: 8000 }),
    )

    expect(result.current.buildingListFilters).toEqual({ maxRent: 8000 })
    expect(result.current.buildingDetailFilters).toEqual({ maxRent: 8000 })
  })
})
