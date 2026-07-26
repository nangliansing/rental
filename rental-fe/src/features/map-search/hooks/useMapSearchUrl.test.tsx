import { renderHook, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { DEFAULT_MAP_SEARCH_FILTERS } from "../context/MapSearchFilterContext"
import { useMapSearchUrl } from "./useMapSearchUrl"
import type { MapSearchUrlState } from "../utils/map-search-url"

const nearbyUrlState: MapSearchUrlState = {
  source: "nearby",
  bounds: null,
  position: { lat: 13.7653, lng: 100.642 },
  linePoints: [],
  radiusMeters: 1_000,
  filters: DEFAULT_MAP_SEARCH_FILTERS,
  buildingId: null,
  listingId: null,
}

function SearchParamsReader({
  onChange,
}: {
  onChange: (value: string) => void
}) {
  const [searchParams] = useSearchParams()
  onChange(searchParams.toString())
  return null
}

function renderUrlHook(
  initialUrlState: MapSearchUrlState,
  initialEntry = "/?search=nearby&lat=13.7653&lng=100.642&radius=1000",
) {
  const onPopRestore = vi.fn()
  let latestSearchParams = ""

  const hook = renderHook(
    () => useMapSearchUrl({ initialUrlState, onPopRestore }),
    {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  {children}
                  <SearchParamsReader
                    onChange={(value) => {
                      latestSearchParams = value
                    }}
                  />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      ),
    },
  )

  return {
    onPopRestore,
    getSearchParams: () => latestSearchParams,
    ...hook,
  }
}

describe("useMapSearchUrl", () => {
  it("initializes submitted search state from the parsed URL", () => {
    const { result } = renderUrlHook(nearbyUrlState)

    expect(result.current.searchSource).toBe("nearby")
    expect(result.current.submittedNearbyPosition).toEqual({
      lat: 13.7653,
      lng: 100.642,
    })
    expect(result.current.nearbyRadiusMeters).toBe(1_000)
    expect(result.current.cameraRestoreVersion).toBe(1)
    expect(result.current.isListingSearch).toBe(false)
  })

  it("writes committed search state to the URL", async () => {
    const { result, getSearchParams } = renderUrlHook(nearbyUrlState)

    result.current.updateSearchUrl({
      source: "nearby",
      bounds: null,
      position: { lat: 13.77, lng: 100.65 },
      linePoints: [],
      radiusMeters: 1_250,
      filters: { minRent: 2_000 },
      buildingId: "building-1",
      listingId: null,
    })

    await waitFor(() => {
      const search = getSearchParams()
      expect(search).toContain("search=nearby")
      expect(search).toContain("building=building-1")
      expect(search).toContain("radius=1250")
    })
  })

  it("derives listing search purpose from the URL", () => {
    const { result } = renderUrlHook(nearbyUrlState, "/?purpose=list")

    expect(result.current.searchPurpose).toBe("list")
    expect(result.current.isListingSearch).toBe(true)
  })

  it("derives the pending listing overlay from the URL", () => {
    const { result } = renderUrlHook(
      {
        ...nearbyUrlState,
        buildingId: "building-1",
        listingId: "listing-1",
      },
      "/?search=nearby&lat=13.7653&lng=100.642&radius=1000&building=building-1&listing=listing-1",
    )

    expect(result.current.pendingListingId).toBe("listing-1")
  })

  it("clears the listing purpose parameter", async () => {
    const { result, getSearchParams } = renderUrlHook(
      nearbyUrlState,
      "/?purpose=list&search=nearby&lat=13.7653&lng=100.642&radius=1000",
    )

    result.current.clearListingPurpose()

    await waitFor(() => {
      const search = getSearchParams()
      expect(search).not.toContain("purpose=list")
      expect(search).toContain("search=nearby")
    })
  })
})
