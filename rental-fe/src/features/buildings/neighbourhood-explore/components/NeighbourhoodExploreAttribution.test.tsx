import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { NEIGHBOURHOOD_ALL_CATEGORY_KEY } from "../../constants/neighbourhood"
import {
  NeighbourhoodExploreDataContext,
  type NeighbourhoodExploreDataContextValue,
} from "../context/NeighbourhoodExploreDataContext"
import { sampleNeighbourhoodExploreData } from "../__tests__/neighbourhoodExploreFixtures"
import { NeighbourhoodExploreAttribution } from "./NeighbourhoodExploreAttribution"

function createDataContextValue(
  summary: NonNullable<NeighbourhoodExploreDataContextValue["neighbourhood"]>["summary"],
): NeighbourhoodExploreDataContextValue {
  return {
    neighbourhood: {
      ...sampleNeighbourhoodExploreData,
      summary,
    },
    origin: sampleNeighbourhoodExploreData.origin,
    visiblePlaces: sampleNeighbourhoodExploreData.places,
    categoryPillOptions: [
      { value: NEIGHBOURHOOD_ALL_CATEGORY_KEY, label: "All (3)" },
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
  }
}

function renderAttribution(
  summary: NonNullable<NeighbourhoodExploreDataContextValue["neighbourhood"]>["summary"],
  variant: "overlay" | "footer" = "overlay",
) {
  return render(
    <NeighbourhoodExploreDataContext.Provider
      value={createDataContextValue(summary)}
    >
      <NeighbourhoodExploreAttribution variant={variant} />
    </NeighbourhoodExploreDataContext.Provider>,
  )
}

describe("NeighbourhoodExploreAttribution", () => {
  it("renders the overlay attribution without a truncation hint", () => {
    renderAttribution({ all: 3 })

    expect(
      screen.getByText("Straight-line distances · © OpenStreetMap"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument()
  })

  it("renders the footer attribution with contributors copy", () => {
    renderAttribution({ all: 3 }, "footer")

    expect(
      screen.getByText("Straight-line distances · © OpenStreetMap contributors"),
    ).toBeInTheDocument()
  })

  it("includes a count-based truncation hint in the overlay", () => {
    renderAttribution({
      all: 20,
      truncated: true,
      totalWithinRadius: 48,
    })

    expect(
      screen.getByText(
        "Showing 20 of 48 nearby places · Straight-line distances · © OpenStreetMap",
      ),
    ).toBeInTheDocument()
  })

  it("includes the generic truncation hint in the footer", () => {
    renderAttribution(
      {
        all: 20,
        truncated: true,
      },
      "footer",
    )

    expect(
      screen.getByText(
        "Showing closest places only · Straight-line distances · © OpenStreetMap contributors",
      ),
    ).toBeInTheDocument()
  })
})
