import { createRef } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { renderWithProviders } from "@/test/renderWithProviders"

import {
  mockNeighbourhoodExploreResponse,
  NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
} from "../../__tests__/neighbourhoodExploreFixtures"
import { NeighbourhoodExploreProvider } from "../../NeighbourhoodExploreProvider"
import {
  useNeighbourhoodExploreSelection,
} from "../../NeighbourhoodExploreContext"
import { SELECT_PLACE_WITHOUT_LIST_SCROLL } from "../../context/NeighbourhoodExploreSelectionContext"
import * as scrollUtils from "../../utils/scrollElementIntoViewIfNeeded"
import { NeighbourhoodPlaceListPanel } from "./NeighbourhoodPlaceListPanel"
import {
  NeighbourhoodPlaceList,
  type NeighbourhoodPlaceListHandle,
} from "./NeighbourhoodPlaceList"

function SelectionHarness() {
  const { selectPlace, selectedPlaceId } = useNeighbourhoodExploreSelection()

  return (
    <>
      <button type="button" onClick={() => selectPlace("place-cafe")}>
        Select from map
      </button>
      <button
        type="button"
        onClick={() => selectPlace("place-restaurant", SELECT_PLACE_WITHOUT_LIST_SCROLL)}
      >
        Select from list
      </button>
      <p data-testid="selected-place-id">{selectedPlaceId ?? "none"}</p>
      <NeighbourhoodPlaceListPanel />
    </>
  )
}

function renderSelectionScenario() {
  mockNeighbourhoodExploreResponse()

  return renderWithProviders(
    <NeighbourhoodExploreProvider
      buildingId={NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID}
      enabled
    >
      <SelectionHarness />
    </NeighbourhoodExploreProvider>,
  )
}

describe("neighbourhood explore selection scenarios", () => {
  beforeEach(() => {
    vi.spyOn(scrollUtils, "scrollElementIntoViewIfNeeded")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("scrolls with top alignment when a place is selected from the map", async () => {
    const user = userEvent.setup()
    renderSelectionScenario()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Local Cafe/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Select from map" }))

    await waitFor(() => {
      expect(scrollUtils.scrollElementIntoViewIfNeeded).toHaveBeenCalled()
    })

    expect(scrollUtils.scrollElementIntoViewIfNeeded).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      scrollUtils.NEIGHBOURHOOD_ACTIVE_PLACE_SCROLL_OPTIONS,
    )
    expect(screen.getByTestId("selected-place-id")).toHaveTextContent("place-cafe")
  })

  it("does not scroll when a place is selected from the list", async () => {
    const user = userEvent.setup()
    renderSelectionScenario()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Thai Kitchen/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Thai Kitchen/i }))

    await waitFor(() => {
      expect(screen.getByTestId("selected-place-id")).toHaveTextContent("place-restaurant")
    })

    expect(scrollUtils.scrollElementIntoViewIfNeeded).not.toHaveBeenCalled()
  })

  it("scrolls again after switching from a list selection to a map selection", async () => {
    const user = userEvent.setup()
    renderSelectionScenario()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /7-Eleven/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /7-Eleven/i }))
    expect(scrollUtils.scrollElementIntoViewIfNeeded).not.toHaveBeenCalled()

    vi.mocked(scrollUtils.scrollElementIntoViewIfNeeded).mockClear()

    await user.click(screen.getByRole("button", { name: "Select from map" }))

    await waitFor(() => {
      expect(scrollUtils.scrollElementIntoViewIfNeeded).toHaveBeenCalled()
    })
  })

  it("does not scroll when re-selecting the same place from the list", async () => {
    const user = userEvent.setup()
    renderSelectionScenario()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Local Cafe/i })).toBeInTheDocument()
    })

    const listItem = screen.getByRole("button", { name: /Local Cafe/i })

    await user.click(listItem)
    await user.click(listItem)

    expect(scrollUtils.scrollElementIntoViewIfNeeded).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /Local Cafe/i })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  it("scrolls when the same place is re-selected from the map", async () => {
    const user = userEvent.setup()
    renderSelectionScenario()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select from map" })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Select from map" }))
    await waitFor(() => {
      expect(scrollUtils.scrollElementIntoViewIfNeeded).toHaveBeenCalled()
    })

    const callsAfterFirstSelect =
      vi.mocked(scrollUtils.scrollElementIntoViewIfNeeded).mock.calls.length

    await user.click(screen.getByRole("button", { name: "Select from map" }))

    await waitFor(() => {
      expect(
        vi.mocked(scrollUtils.scrollElementIntoViewIfNeeded).mock.calls.length,
      ).toBeGreaterThan(callsAfterFirstSelect)
    })
  })
})

describe("neighbourhood explore list scroll handle scenarios", () => {
  it("uses start alignment when scrolling through the list handle", () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollTo = vi.fn()

    render(
      <NeighbourhoodPlaceList
        ref={listRef}
        places={[
          {
            id: "place-1",
            name: "Place one",
            lat: 13.76,
            lng: 100.64,
            category: "cafe",
            distanceMeters: 120,
          },
          {
            id: "place-2",
            name: "Place two",
            lat: 13.761,
            lng: 100.641,
            category: "restaurant",
            distanceMeters: 240,
          },
        ]}
        activePlaceId={null}
        onPlaceSelect={vi.fn()}
      />,
    )

    const container = screen.getByRole("list")
    Object.defineProperties(container, {
      scrollTop: { configurable: true, value: 0, writable: true },
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 80 },
      scrollTo: { configurable: true, value: scrollTo },
    })

    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 80,
      left: 0,
      right: 200,
      width: 200,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const target = screen.getByRole("button", { name: /Place two/i })
    Object.defineProperty(target, "offsetHeight", {
      configurable: true,
      value: 60,
    })
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 200,
      bottom: 260,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    })

    expect(listRef.current?.scrollToPlace("place-2")).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 200, behavior: "auto" })
  })
})
