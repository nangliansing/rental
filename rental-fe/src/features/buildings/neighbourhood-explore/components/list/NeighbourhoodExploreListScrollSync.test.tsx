import { createRef, type ReactNode } from "react"
import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  NeighbourhoodExploreSelectionContext,
  type NeighbourhoodExploreSelectionContextValue,
} from "../../context/NeighbourhoodExploreSelectionContext"
import { NeighbourhoodExploreListPlaceSync } from "../sync/NeighbourhoodExploreListPlaceSync"
import type { NeighbourhoodPlaceListHandle } from "./NeighbourhoodPlaceList"

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

describe("NeighbourhoodExploreListPlaceSync", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("scrolls the active place after context updates", async () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: null,
      selectedPlace: null,
      selectedPlaceRevision: 0,
      selectPlace: vi.fn(),
    }

    const { rerender } = renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      baseValue,
    )

    rerender(
      <NeighbourhoodExploreSelectionContext.Provider
        value={{
          ...baseValue,
          selectedPlaceId: "place-2",
          selectedPlaceRevision: 1,
        }}
      >
        <NeighbourhoodExploreListPlaceSync listRef={listRef} />
      </NeighbourhoodExploreSelectionContext.Provider>,
    )

    await waitFor(() =>
      expect(scrollToPlace).toHaveBeenCalledWith("place-2"),
    )
  })

  it("waits until list scrolling is enabled before syncing", async () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: "place-2",
      selectedPlace: null,
      selectedPlaceRevision: 1,
      selectPlace: vi.fn(),
    }

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync
        listRef={listRef}
        isListScrollEnabled={false}
      />,
      baseValue,
    )

    expect(scrollToPlace).not.toHaveBeenCalled()

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} isListScrollEnabled />,
      baseValue,
    )

    await waitFor(() =>
      expect(scrollToPlace).toHaveBeenCalledWith("place-2"),
    )
  })

  it("re-scrolls when the same place is selected again", async () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: "place-2",
      selectedPlace: null,
      selectedPlaceRevision: 1,
      selectPlace: vi.fn(),
    }

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      baseValue,
    )

    await waitFor(() =>
      expect(scrollToPlace).toHaveBeenCalledWith("place-2"),
    )

    scrollToPlace.mockClear()

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      {
        ...baseValue,
        selectedPlaceRevision: 2,
      },
    )

    await waitFor(() =>
      expect(scrollToPlace).toHaveBeenCalledWith("place-2"),
    )
  })

  it("retries scrolling when the first attempt fails", async () => {
    vi.useFakeTimers()

    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    listRef.current = { scrollToPlace }

    const baseValue: NeighbourhoodExploreSelectionContextValue = {
      selectedPlaceId: "place-2",
      selectedPlace: null,
      selectedPlaceRevision: 1,
      selectPlace: vi.fn(),
    }

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      baseValue,
    )

    expect(scrollToPlace).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(16)

    expect(scrollToPlace).toHaveBeenCalledTimes(2)
  })
})
