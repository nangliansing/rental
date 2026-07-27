import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import {
  mockNeighbourhoodExploreResponse,
  NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
} from "../../__tests__/neighbourhoodExploreFixtures"
import {
  useNeighbourhoodExplorePlaceSelection,
} from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import { NeighbourhoodExploreProvider } from "../../NeighbourhoodExploreProvider"
import { renderWithProviders } from "@/test/renderWithProviders"
import { NeighbourhoodPlaceMarker } from "./NeighbourhoodPlaceMarker"
import { NeighbourhoodPlaceMarkerSurface } from "./NeighbourhoodPlaceMarkerSurface"

const place: NeighbourhoodPlace = {
  id: "place-cafe",
  name: "Local Cafe",
  lat: 13.762,
  lng: 100.641,
  category: "cafe",
  distanceMeters: 420,
}

function MapPlacePinHarness() {
  const { selectedPlaceId, selectedPlaceRevision, selectPlace } =
    useNeighbourhoodExplorePlaceSelection()
  const isSelected = place.id === selectedPlaceId

  return (
    <>
      <p data-testid="selected-place-id">{selectedPlaceId ?? "none"}</p>
      <p data-testid="selected-place-revision">{selectedPlaceRevision}</p>
      <NeighbourhoodPlaceMarkerSurface
        label={place.name}
        onSelect={() => selectPlace(place.id)}
      >
        <NeighbourhoodPlaceMarker place={place} isSelected={isSelected} />
      </NeighbourhoodPlaceMarkerSurface>
    </>
  )
}

function renderPinSelectionHarness() {
  mockNeighbourhoodExploreResponse()

  return renderWithProviders(
    <NeighbourhoodExploreProvider
      buildingId={NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID}
      enabled
    >
      <MapPlacePinHarness />
    </NeighbourhoodExploreProvider>,
  )
}

describe("neighbourhood explore pin selection", () => {
  it("selects a place when its map pin is clicked", async () => {
    const user = userEvent.setup()
    renderPinSelectionHarness()

    await waitFor(() => {
      expect(screen.getByTestId("selected-place-id")).toHaveTextContent("none")
    })

    await user.click(screen.getByLabelText("Local Cafe"))

    await waitFor(() => {
      expect(screen.getByTestId("selected-place-id")).toHaveTextContent("place-cafe")
      expect(screen.getByTestId("selected-place-revision")).toHaveTextContent("1")
    })
  })

  it("bumps the selection revision when the same pin is clicked again", async () => {
    const user = userEvent.setup()
    renderPinSelectionHarness()

    await user.click(screen.getByLabelText("Local Cafe"))

    await waitFor(() => {
      expect(screen.getByTestId("selected-place-revision")).toHaveTextContent("1")
    })

    await user.click(screen.getByLabelText("Local Cafe"))

    await waitFor(() => {
      expect(screen.getByTestId("selected-place-revision")).toHaveTextContent("2")
    })
  })
})
