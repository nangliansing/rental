import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  MAP_SEARCH_MAP_INSTANCE_ID,
  NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID,
} from "@/shared/google-maps/googleMapsConfig"
import { createTestQueryClient } from "@/test/renderWithProviders"
import { QueryClientProvider } from "@tanstack/react-query"

import {
  mockNeighbourhoodExploreResponse,
  NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
} from "./neighbourhoodExploreFixtures"
import {
  useNeighbourhoodExploreData,
  useNeighbourhoodExploreSelection,
} from "../NeighbourhoodExploreContext"
import { NeighbourhoodExploreProvider } from "../NeighbourhoodExploreProvider"

function createProviderWrapper() {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <NeighbourhoodExploreProvider
          buildingId={NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID}
          enabled
        >
          {children}
        </NeighbourhoodExploreProvider>
      </QueryClientProvider>
    )
  }
}

function useExploreContexts() {
  const data = useNeighbourhoodExploreData()
  const selection = useNeighbourhoodExploreSelection()

  return { data, selection }
}

describe("neighbourhood explore render isolation", () => {
  it("uses a dedicated explore map instance id", () => {
    expect(NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID).toBe("neighbourhood-explore")
    expect(NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID).not.toBe(
      MAP_SEARCH_MAP_INSTANCE_ID,
    )
  })

  it("keeps data context fields stable when selection changes", async () => {
    mockNeighbourhoodExploreResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.neighbourhood).toBeDefined()
    })

    const visiblePlacesRef = result.current.data.visiblePlaces
    const selectedCategory = result.current.data.selectedCategory
    const radiusMeters = result.current.data.radiusMeters

    act(() => {
      result.current.selection.selectPlace("place-cafe")
    })

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceId).toBe("place-cafe")
    })

    expect(result.current.data.visiblePlaces).toBe(visiblePlacesRef)
    expect(result.current.data.selectedCategory).toBe(selectedCategory)
    expect(result.current.data.radiusMeters).toBe(radiusMeters)
  })

  it("keeps selection context fields stable when only data filters change", async () => {
    mockNeighbourhoodExploreResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.neighbourhood).toBeDefined()
    })

    act(() => {
      result.current.selection.selectPlace("place-cafe")
    })

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceId).toBe("place-cafe")
    })

    const selectedPlaceId = result.current.selection.selectedPlaceId
    const selectedPlaceRevision =
      result.current.selection.selectedPlaceRevision
    const selectPlace = result.current.selection.selectPlace

    act(() => {
      result.current.data.setCategory("cafe")
    })

    await waitFor(() => {
      expect(result.current.data.selectedCategory).toBe("cafe")
    })

    expect(result.current.selection.selectedPlaceId).toBe(selectedPlaceId)
    expect(result.current.selection.selectedPlaceRevision).toBe(
      selectedPlaceRevision,
    )
    expect(result.current.selection.selectPlace).toBe(selectPlace)
  })
})
