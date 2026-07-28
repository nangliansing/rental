import { createRef, type ReactNode } from "react"
import { render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

function createSelectionContextValue(
  overrides: Partial<NeighbourhoodExploreSelectionContextValue> = {},
): NeighbourhoodExploreSelectionContextValue {
  return {
    selectedPlaceId: null,
    selectedPlace: null,
    selectedPlaceRevision: 0,
    shouldScrollSelectedPlaceIntoView: true,
    selectPlace: vi.fn(),
    ...overrides,
  }
}

describe("NeighbourhoodExploreListPlaceSync", () => {
  it("scrolls the active place after context updates", async () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    const baseValue = createSelectionContextValue()

    const { rerender } = renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      baseValue,
    )

    rerender(
      <NeighbourhoodExploreSelectionContext.Provider
        value={createSelectionContextValue({
          selectedPlaceId: "place-2",
          selectedPlaceRevision: 1,
        })}
      >
        <NeighbourhoodExploreListPlaceSync listRef={listRef} />
      </NeighbourhoodExploreSelectionContext.Provider>,
    )

    await waitFor(() =>
      expect(scrollToPlace).toHaveBeenCalledWith("place-2"),
    )
  })

  it("does not scroll when the selection came from the list", () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      createSelectionContextValue({
        selectedPlaceId: "place-2",
        selectedPlaceRevision: 1,
        shouldScrollSelectedPlaceIntoView: false,
      }),
    )

    expect(scrollToPlace).not.toHaveBeenCalled()
  })

  it("waits until list scrolling is enabled before syncing", async () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi.fn(() => true)
    listRef.current = { scrollToPlace }

    const baseValue = createSelectionContextValue({
      selectedPlaceId: "place-2",
      selectedPlaceRevision: 1,
    })

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

    const baseValue = createSelectionContextValue({
      selectedPlaceId: "place-2",
      selectedPlaceRevision: 1,
    })

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

  it("retries scrolling on later animation frames when early attempts fail", () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollToPlace = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    listRef.current = { scrollToPlace }

    const rafCallbacks: FrameRequestCallback[] = []
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })

    const baseValue = createSelectionContextValue({
      selectedPlaceId: "place-2",
      selectedPlaceRevision: 1,
    })

    renderWithSelection(
      <NeighbourhoodExploreListPlaceSync listRef={listRef} />,
      baseValue,
    )

    expect(scrollToPlace).toHaveBeenCalledTimes(1)

    while (rafCallbacks.length > 0) {
      const pendingCallbacks = rafCallbacks.splice(0)
      pendingCallbacks.forEach((callback) => {
        callback(0)
      })
    }

    expect(scrollToPlace).toHaveBeenCalledTimes(3)
  })
})
