import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useMapSearchSessionAssembly } from "./useMapSearchSessionAssembly"

function createAssemblyInput(
  overrides: Record<string, unknown> = {},
) {
  const commands = {
    onPlaceFound: vi.fn(),
    onSearchArea: vi.fn(),
    onDropPin: vi.fn(),
    onCurrentLocationFound: vi.fn(),
    onPinChange: vi.fn(),
    onMapMove: vi.fn(),
    onNearbyRadiusChange: vi.fn(),
    onSearchNearby: vi.fn(),
    onClearPin: vi.fn(),
    onToggleLineMode: vi.fn(),
    onAddLinePoint: vi.fn(),
    onUndoLinePoint: vi.fn(),
    onLineDistanceChange: vi.fn(),
    onSearchLine: vi.fn(),
    onBuildingSelect: vi.fn(),
    onSearchAgain: vi.fn(),
    onExitListingSearch: vi.fn(),
    onListExistingBuilding: vi.fn(),
    onListNewBuilding: vi.fn(),
  }

  return {
    searchedPlace: null,
    buildings: [],
    activeSelectedBuilding: null,
    hoveredBuildingId: null,
    pendingBuildingId: null,
    isPendingBuildingUnresolved: false,
    selectedPin: null,
    nearbyRadiusMeters: 1_000,
    linePoints: [],
    lineDistanceMeters: 500,
    submittedBounds: null,
    cameraRestoreVersion: 0,
    isPlaceSearchOpen: false,
    isListingSearch: false,
    searchSource: "area" as const,
    searchStatus: "idle" as const,
    isSearchActionVisible: true,
    canCreateListing: false,
    buildingDetailFilters: {},
    buildingSearch: {
      isSearchingArea: false,
      isSearchingNearby: false,
      isSearchingLine: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isRefreshing: false,
      isError: false,
    },
    commands,
    onPlaceSearchOpenChange: vi.fn(),
    onBuildingHoverChange: vi.fn(),
    onFetchNextPage: vi.fn(),
    ...overrides,
  }
}

describe("useMapSearchSessionAssembly", () => {
  it("returns five memoized session slices", () => {
    const { result } = renderHook(() =>
      useMapSearchSessionAssembly(createAssemblyInput()),
    )

    expect(Object.keys(result.current)).toEqual([
      "canvas",
      "controls",
      "place",
      "results",
      "markerHighlight",
    ])
  })

  it("keeps canvas reference stable when only hover changes", () => {
    const input = createAssemblyInput()
    const { result, rerender } = renderHook(
      (props) => useMapSearchSessionAssembly(props),
      { initialProps: input },
    )

    const initialCanvas = result.current.canvas

    rerender({
      ...input,
      hoveredBuildingId: "building-1",
    })

    expect(result.current.canvas).toBe(initialCanvas)
    expect(result.current.markerHighlight.hoveredBuildingId).toBe("building-1")
  })

  it("keeps canvas reference stable when only controls inputs change", () => {
    const input = createAssemblyInput()
    const { result, rerender } = renderHook(
      (props) => useMapSearchSessionAssembly(props),
      { initialProps: input },
    )

    const initialCanvas = result.current.canvas
    const initialControls = result.current.controls

    rerender({
      ...input,
      isSearchActionVisible: false,
      buildingSearch: {
        ...input.buildingSearch,
        isSearchingArea: true,
      },
    })

    expect(result.current.canvas).toBe(initialCanvas)
    expect(result.current.controls).not.toBe(initialControls)
  })

  it("defaults searchSource to area in the results slice", () => {
    const { result } = renderHook(() =>
      useMapSearchSessionAssembly(
        createAssemblyInput({ searchSource: null }),
      ),
    )

    expect(result.current.results.searchSource).toBe("area")
  })
})
