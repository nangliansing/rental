import type { PropsWithChildren } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NEIGHBOURHOOD_ALL_CATEGORY_KEY } from "../constants/neighbourhood"
import { createTestQueryClient } from "@/test/renderWithProviders"
import { QueryClientProvider } from "@tanstack/react-query"

import {
  mockNeighbourhoodExploreResponse,
  NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
  sampleNeighbourhoodExploreData,
} from "./__tests__/neighbourhoodExploreFixtures"
import { NeighbourhoodExploreProvider } from "./NeighbourhoodExploreProvider"
import {
  useNeighbourhoodExploreData,
  useNeighbourhoodExploreSelection,
} from "./NeighbourhoodExploreContext"

const sampleNeighbourhood = sampleNeighbourhoodExploreData
const BUILDING_ID = NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID

function mockNeighbourhoodResponse(data = sampleNeighbourhood) {
  mockNeighbourhoodExploreResponse(data)
}

function createProviderWrapper(enabled = true) {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <NeighbourhoodExploreProvider buildingId={BUILDING_ID} enabled={enabled}>
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

describe("NeighbourhoodExploreProvider", () => {
  it("loads neighbourhood data and exposes visible places", async () => {
    mockNeighbourhoodResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    expect(result.current.data.isInitialLoading).toBe(true)
    expect(result.current.data.showMap).toBe(false)

    await waitFor(() => {
      expect(result.current.data.isInitialLoading).toBe(false)
    })

    expect(result.current.data.neighbourhood).toMatchObject(sampleNeighbourhood)
    expect(result.current.data.visiblePlaces).toHaveLength(3)
    expect(result.current.data.showMap).toBe(true)
    expect(result.current.data.origin).toEqual(sampleNeighbourhood.origin)
  })

  it("filters visible places when the category changes", async () => {
    mockNeighbourhoodResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.isInitialLoading).toBe(false)
    })

    result.current.data.setCategory("cafe")

    await waitFor(() => {
      expect(result.current.data.visiblePlaces).toEqual([
        sampleNeighbourhood.places[1],
      ])
    })

    expect(result.current.data.selectedCategory).toBe("cafe")
  })

  it("tracks place selection and bumps revision on each select", async () => {
    mockNeighbourhoodResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.isInitialLoading).toBe(false)
    })

    result.current.selection.selectPlace("place-cafe")

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceId).toBe("place-cafe")
    })

    expect(result.current.selection.selectedPlace).toEqual(
      sampleNeighbourhood.places[1],
    )
    expect(result.current.selection.selectedPlaceRevision).toBe(1)
    expect(result.current.selection.shouldScrollSelectedPlaceIntoView).toBe(true)

    result.current.selection.selectPlace("place-cafe", { scrollIntoView: false })

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceRevision).toBe(2)
      expect(result.current.selection.shouldScrollSelectedPlaceIntoView).toBe(false)
    })

    result.current.selection.selectPlace("place-cafe")

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceRevision).toBe(3)
      expect(result.current.selection.shouldScrollSelectedPlaceIntoView).toBe(true)
    })
  })

  it("clears the effective selection when the selected place is filtered out", async () => {
    mockNeighbourhoodResponse()

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.isInitialLoading).toBe(false)
    })

    result.current.selection.selectPlace("place-cafe")

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceId).toBe("place-cafe")
    })

    result.current.data.setCategory("convenience")

    await waitFor(() => {
      expect(result.current.selection.selectedPlaceId).toBeNull()
      expect(result.current.selection.selectedPlace).toBeNull()
    })
  })

  it("shows an empty state instead of the map when no places match", async () => {
    mockNeighbourhoodResponse({
      ...sampleNeighbourhood,
      summary: { all: 0 },
      categories: [],
      places: [],
    })

    const { result } = renderHook(() => useExploreContexts(), {
      wrapper: createProviderWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data.isInitialLoading).toBe(false)
    })

    expect(result.current.data.visiblePlaces).toEqual([])
    expect(result.current.data.showMap).toBe(false)
    expect(result.current.data.selectedCategory).toBe(
      NEIGHBOURHOOD_ALL_CATEGORY_KEY,
    )
  })
})
