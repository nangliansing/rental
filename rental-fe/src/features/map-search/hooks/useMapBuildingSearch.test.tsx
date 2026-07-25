import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSearchBuildingsInMap } from "../api/useSearchBuildingsInMap"
import { useSearchBuildingsNearby } from "../api/useSearchBuildingsNearby"
import { useSearchBuildingsNearLines } from "../api/useSearchBuildingsNearLines"
import type { SearchBuilding } from "../types"
import { useMapBuildingSearch } from "./useMapBuildingSearch"

vi.mock("../api/useSearchBuildingsInMap")
vi.mock("../api/useSearchBuildingsNearby")
vi.mock("../api/useSearchBuildingsNearLines")

const building = { _id: "building-1" } as SearchBuilding
const fetchAreaNextPage = vi.fn()
const fetchLineNextPage = vi.fn()

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  } as never
}

const baseInput = {
  search: {
    source: "line" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [100.6, 13.7],
        [100.7, 13.8],
      ] as [[number, number], [number, number]],
    },
    distanceMeters: 500,
  },
  activeSource: "line" as const,
  filters: { minRent: 5_000 },
  isStale: false,
  hasSelectedBuilding: false,
  includeBuildingsWithoutMatchingListings: false,
}

describe("useMapBuildingSearch", () => {
  beforeEach(() => {
    fetchAreaNextPage.mockClear()
    fetchLineNextPage.mockClear()
    vi.mocked(useSearchBuildingsInMap).mockReturnValue(
      queryResult({ fetchNextPage: fetchAreaNextPage }),
    )
    vi.mocked(useSearchBuildingsNearby).mockReturnValue(queryResult())
    vi.mocked(useSearchBuildingsNearLines).mockReturnValue(
      queryResult({
        data: { pages: [{ data: [building, building] }] },
        hasNextPage: true,
        fetchNextPage: fetchLineNextPage,
      }),
    )
  })

  it("prepares and enables only the submitted source", () => {
    const { result } = renderHook(() => useMapBuildingSearch(baseInput))

    expect(useSearchBuildingsInMap).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: null, filters: {}, enabled: false }),
    )
    expect(useSearchBuildingsNearby).toHaveBeenCalledWith(
      expect.objectContaining({ position: null, filters: {}, enabled: false }),
    )
    expect(useSearchBuildingsNearLines).toHaveBeenCalledWith(
      expect.objectContaining({
        geometry: baseInput.search.geometry,
        filters: baseInput.filters,
        enabled: true,
      }),
    )
    expect(result.current.buildings).toEqual([building])
    expect(result.current.status).toBe("success")
    expect(result.current.hasNextPage).toBe(true)
  })

  it("routes pagination only to paginated active sources", () => {
    const { result } = renderHook(() => useMapBuildingSearch(baseInput))

    result.current.fetchNextPage()

    expect(fetchLineNextPage).toHaveBeenCalledOnce()
    expect(fetchAreaNextPage).not.toHaveBeenCalled()
  })

  it("reports stale before cached result state", () => {
    const { result } = renderHook(() =>
      useMapBuildingSearch({ ...baseInput, isStale: true }),
    )

    expect(result.current.status).toBe("stale")
    expect(useSearchBuildingsNearLines).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it("disables malformed submitted geometry", () => {
    renderHook(() =>
      useMapBuildingSearch({
        ...baseInput,
        search: {
          source: "line",
          geometry: {
            type: "LineString",
            coordinates: [[Number.NaN, 13.7]],
          },
          distanceMeters: 500,
        },
      }),
    )

    expect(useSearchBuildingsNearLines).toHaveBeenCalledWith(
      expect.objectContaining({ geometry: null, enabled: false }),
    )
  })

  it("does not fetch when no next page is available", () => {
    vi.mocked(useSearchBuildingsNearLines).mockReturnValue(
      queryResult({ fetchNextPage: fetchLineNextPage }),
    )
    const { result } = renderHook(() => useMapBuildingSearch(baseInput))

    result.current.fetchNextPage()

    expect(fetchLineNextPage).not.toHaveBeenCalled()
  })
})
