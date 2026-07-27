import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NEIGHBOURHOOD_ALL_CATEGORY_KEY } from "../../constants/neighbourhood"
import { renderWithProviders } from "@/test/renderWithProviders"

import {
  mockNeighbourhoodExploreResponse,
  NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
  sampleNeighbourhoodExploreData,
} from "../__tests__/neighbourhoodExploreFixtures"
import {
  NeighbourhoodExploreDataContext,
  type NeighbourhoodExploreDataContextValue,
} from "../context/NeighbourhoodExploreDataContext"
import { useNeighbourhoodExploreData } from "../NeighbourhoodExploreContext"
import { NeighbourhoodExploreProvider } from "../NeighbourhoodExploreProvider"
import { NeighbourhoodExploreCategoryBar } from "./NeighbourhoodExploreCategoryBar"

function VisiblePlacesProbe() {
  const { visiblePlaces, selectedCategory } = useNeighbourhoodExploreData()

  return (
    <div>
      <p data-testid="selected-category">{selectedCategory}</p>
      <p data-testid="visible-place-count">{visiblePlaces.length}</p>
      <ul>
        {visiblePlaces.map((place) => (
          <li key={place.id}>{place.name}</li>
        ))}
      </ul>
    </div>
  )
}

function renderCategoryBarWithProvider() {
  return renderWithProviders(
    <NeighbourhoodExploreProvider
      buildingId={NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID}
      enabled
    >
      <NeighbourhoodExploreCategoryBar />
      <VisiblePlacesProbe />
    </NeighbourhoodExploreProvider>,
  )
}

function renderCategoryBarWithData(
  overrides: Partial<NeighbourhoodExploreDataContextValue> = {},
) {
  const value: NeighbourhoodExploreDataContextValue = {
    neighbourhood: sampleNeighbourhoodExploreData,
    origin: sampleNeighbourhoodExploreData.origin,
    visiblePlaces: sampleNeighbourhoodExploreData.places,
    categoryPillOptions: [
      { value: NEIGHBOURHOOD_ALL_CATEGORY_KEY, label: "All (3)" },
      { value: "cafe", label: "Cafes (1)" },
    ],
    radiusMeters: 1000,
    selectedCategory: NEIGHBOURHOOD_ALL_CATEGORY_KEY,
    isInitialLoading: false,
    isInitialError: false,
    isBackgroundFetching: false,
    showMap: true,
    setRadius: vi.fn(),
    setCategory: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  }

  return render(
    <NeighbourhoodExploreDataContext.Provider value={value}>
      <NeighbourhoodExploreCategoryBar />
    </NeighbourhoodExploreDataContext.Provider>,
  )
}

describe("NeighbourhoodExploreCategoryBar", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it("renders category pills after neighbourhood data loads", async () => {
    mockNeighbourhoodExploreResponse()
    renderCategoryBarWithProvider()

    await waitFor(() => {
      expect(
        screen.getByRole("tablist", { name: "Neighbourhood categories" }),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole("tab", { name: "All (3)" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Cafes (1)" })).toBeInTheDocument()
    expect(
      screen.getByRole("tab", { name: "Convenience Stores (1)" }),
    ).toBeInTheDocument()
  })

  it("filters visible places when a category pill is selected", async () => {
    mockNeighbourhoodExploreResponse()
    const { user } = renderCategoryBarWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("visible-place-count")).toHaveTextContent("3")
    })

    await user.click(screen.getByRole("tab", { name: "Cafes (1)" }))

    await waitFor(() => {
      expect(screen.getByTestId("selected-category")).toHaveTextContent("cafe")
      expect(screen.getByTestId("visible-place-count")).toHaveTextContent("1")
    })

    expect(screen.getByText("Local Cafe")).toBeInTheDocument()
    expect(screen.queryByText("7-Eleven")).not.toBeInTheDocument()
  })

  it("returns null when there are no categories and nothing is refreshing", () => {
    const { container } = renderCategoryBarWithData({
      neighbourhood: undefined,
      origin: null,
      visiblePlaces: [],
      categoryPillOptions: [],
      isBackgroundFetching: false,
    })

    expect(container).toBeEmptyDOMElement()
  })

  it("shows a background refresh status while refetching", () => {
    renderCategoryBarWithData({
      isBackgroundFetching: true,
    })

    expect(screen.getByText("Updating nearby places...")).toBeInTheDocument()
  })
})
