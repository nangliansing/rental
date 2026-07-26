import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useMapSearchCommands } from "./useMapSearchCommands"

const bounds = {
  northEast: { lat: 14, lng: 101 },
  southWest: { lat: 13, lng: 100 },
}

function createCommandsInput(
  overrides: Record<string, unknown> = {},
) {
  const updateSearchUrl = vi.fn()
  const submitFilters = vi.fn(() => ({ minRent: 1_000 }))
  const mapInteraction = {
    mode: "area" as const,
    selectedPin: null,
    currentLocation: null,
    pinSource: null,
    enterManualPinMode: vi.fn(),
    enterCurrentLocationMode: vi.fn(),
    movePin: vi.fn(),
    enterLineMode: vi.fn(),
    exitLineMode: vi.fn(),
    exitPinMode: vi.fn(),
  }

  return {
    input: {
      mapInteraction,
      selectedPin: null,
      searchSource: null,
      submittedBounds: null,
      submittedNearbyPosition: null,
      submittedLineGeometry: null,
      submittedLinePoints: [],
      nearbyRadiusMeters: 1_000,
      lineDistanceMeters: 500,
      linePoints: [],
      submittedFilters: { minRent: 1_000 },
      activeSelectedBuilding: null,
      pendingBuildingId: null,
      pendingListingId: null,
      setSearchSource: vi.fn(),
      setSubmittedBounds: vi.fn(),
      setSubmittedNearbyPosition: vi.fn(),
      setSubmittedLineGeometry: vi.fn(),
      setNearbyRadiusMeters: vi.fn(),
      setLineDistanceMeters: vi.fn(),
      setLinePoints: vi.fn(),
      setPendingBuildingId: vi.fn(),
      setIsStale: vi.fn(),
      setSearchedPlace: vi.fn(),
      setSelectedBuilding: vi.fn(),
      setHoveredBuildingId: vi.fn(),
      updateSearchUrl,
      clearListingPurpose: vi.fn(),
      submitFilters,
      scopedFilters: {
        enterBuildingDetail: vi.fn(),
        enterBuildingList: vi.fn(),
      },
      navigate: vi.fn(),
      refetchActiveSearch: vi.fn(),
      ...overrides,
    },
    updateSearchUrl,
    submitFilters,
    mapInteraction,
  }
}

describe("useMapSearchCommands", () => {
  it("commits an area search and clears stale state", () => {
    const { input, updateSearchUrl, submitFilters } = createCommandsInput({
      searchSource: "nearby",
    })
    const { result } = renderHook(() => useMapSearchCommands(input))

    result.current.onSearchArea(bounds)

    expect(input.setSubmittedBounds).toHaveBeenCalledWith(bounds)
    expect(input.setSelectedBuilding).toHaveBeenCalledWith(null)
    expect(submitFilters).toHaveBeenCalled()
    expect(input.setSearchSource).toHaveBeenCalledWith("area")
    expect(input.setIsStale).toHaveBeenCalledWith(false)
    expect(updateSearchUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "area",
        bounds,
        buildingId: null,
        filters: { minRent: 1_000 },
      }),
    )
  })

  it("clears active search when entering line mode from another mode", () => {
    const { input, mapInteraction } = createCommandsInput({
      searchSource: "area",
    })
    const { result } = renderHook(() => useMapSearchCommands(input))

    result.current.onToggleLineMode()

    expect(input.setSearchSource).toHaveBeenCalledWith(null)
    expect(input.setPendingBuildingId).toHaveBeenCalledWith(null)
    expect(input.updateSearchUrl).toHaveBeenCalledWith(
      expect.objectContaining({ source: null, buildingId: null }),
    )
    expect(mapInteraction.enterLineMode).toHaveBeenCalled()
  })

  it("ignores invalid nearby searches", () => {
    const { input } = createCommandsInput()
    const { result } = renderHook(() => useMapSearchCommands(input))

    result.current.onSearchNearby({ lat: Number.NaN, lng: 100.6 })

    expect(input.setSubmittedNearbyPosition).not.toHaveBeenCalled()
    expect(input.updateSearchUrl).not.toHaveBeenCalled()
  })

  it("marks nearby results stale when the pin moves after a nearby search", () => {
    const { input } = createCommandsInput({ searchSource: "nearby" })
    const { result } = renderHook(() => useMapSearchCommands(input))

    result.current.onPinChange({ lat: 13.7, lng: 100.6 })

    expect(input.mapInteraction.movePin).toHaveBeenCalledWith({
      lat: 13.7,
      lng: 100.6,
    })
    expect(input.setIsStale).toHaveBeenCalledWith(true)
  })
})
