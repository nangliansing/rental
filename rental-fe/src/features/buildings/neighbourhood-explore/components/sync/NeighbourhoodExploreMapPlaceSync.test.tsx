import type { ReactNode } from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  getMapCameraBoundsFromGoogleMap,
  isPositionInsideMapCameraBounds,
} from "@/features/map-search/utils/map-camera"

import {
  NeighbourhoodExploreSelectionContext,
  type NeighbourhoodExploreSelectionContextValue,
} from "../../context/NeighbourhoodExploreSelectionContext"
import { useNeighbourhoodExploreMap } from "../../hooks/useNeighbourhoodExploreMap"
import { NeighbourhoodExploreMapPlaceSync } from "./NeighbourhoodExploreMapPlaceSync"

vi.mock("../../hooks/useNeighbourhoodExploreMap", () => ({
  useNeighbourhoodExploreMap: vi.fn(),
}))

vi.mock("@/features/map-search/utils/map-camera", () => ({
  getMapCameraBoundsFromGoogleMap: vi.fn(),
  isPositionInsideMapCameraBounds: vi.fn(),
}))

const mockedUseMap = vi.mocked(useNeighbourhoodExploreMap)
const mockedGetMapCameraBounds = vi.mocked(getMapCameraBoundsFromGoogleMap)
const mockedIsPositionInsideBounds = vi.mocked(isPositionInsideMapCameraBounds)

function renderWithSelection(
  ui: ReactNode,
  value: NeighbourhoodExploreSelectionContextValue,
) {
  return render(
    <NeighbourhoodExploreSelectionContext.Provider value={value}>
      {ui}
    </NeighbourhoodExploreSelectionContext.Provider>,
  )
}

const selectedPlace = {
  id: "place-cafe",
  name: "Local Cafe",
  lat: 13.762,
  lng: 100.641,
  category: "cafe" as const,
  distanceMeters: 420,
}

describe("NeighbourhoodExploreMapPlaceSync", () => {
  it("pans the map when the active place is outside the viewport", () => {
    const panTo = vi.fn()
    mockedUseMap.mockReturnValue({ panTo } as never)
    mockedGetMapCameraBounds.mockReturnValue({
      north: 13.77,
      south: 13.76,
      east: 100.65,
      west: 100.64,
    })
    mockedIsPositionInsideBounds.mockReturnValue(false)

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: selectedPlace.id,
      selectedPlace,
      selectedPlaceRevision: 1,
      shouldScrollSelectedPlaceIntoView: true,
      selectPlace: vi.fn(),
    }

    renderWithSelection(<NeighbourhoodExploreMapPlaceSync />, baseValue)

    expect(panTo).toHaveBeenCalledWith({
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
    })
  })

  it("does not pan when the active place is already visible", () => {
    const panTo = vi.fn()
    mockedUseMap.mockReturnValue({ panTo } as never)
    mockedGetMapCameraBounds.mockReturnValue({
      north: 13.77,
      south: 13.76,
      east: 100.65,
      west: 100.64,
    })
    mockedIsPositionInsideBounds.mockReturnValue(true)

    renderWithSelection(<NeighbourhoodExploreMapPlaceSync />, {
      selectedPlaceId: selectedPlace.id,
      selectedPlace,
      selectedPlaceRevision: 1,
      shouldScrollSelectedPlaceIntoView: true,
      selectPlace: vi.fn(),
    })

    expect(panTo).not.toHaveBeenCalled()
  })

  it("does not pan when the map is unavailable", () => {
    const panTo = vi.fn()
    mockedUseMap.mockReturnValue(null)

    renderWithSelection(<NeighbourhoodExploreMapPlaceSync />, {
      selectedPlaceId: selectedPlace.id,
      selectedPlace,
      selectedPlaceRevision: 1,
      shouldScrollSelectedPlaceIntoView: true,
      selectPlace: vi.fn(),
    })

    expect(panTo).not.toHaveBeenCalled()
    expect(mockedGetMapCameraBounds).not.toHaveBeenCalled()
  })

  it("re-pans when the same place is selected again", () => {
    const panTo = vi.fn()
    mockedUseMap.mockReturnValue({ panTo } as never)
    mockedGetMapCameraBounds.mockReturnValue({
      north: 13.77,
      south: 13.76,
      east: 100.65,
      west: 100.64,
    })
    mockedIsPositionInsideBounds.mockReturnValue(false)

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: selectedPlace.id,
      selectedPlace,
      selectedPlaceRevision: 1,
      shouldScrollSelectedPlaceIntoView: true,
      selectPlace: vi.fn(),
    }

    const { rerender } = renderWithSelection(
      <NeighbourhoodExploreMapPlaceSync />,
      baseValue,
    )

    expect(panTo).toHaveBeenCalledTimes(1)

    rerender(
      <NeighbourhoodExploreSelectionContext.Provider
        value={{
          ...baseValue,
          selectedPlaceRevision: 2,
        }}
      >
        <NeighbourhoodExploreMapPlaceSync />
      </NeighbourhoodExploreSelectionContext.Provider>,
    )

    expect(panTo).toHaveBeenCalledTimes(2)
  })
})
