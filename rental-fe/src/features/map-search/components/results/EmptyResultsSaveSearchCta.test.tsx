import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MAP_SAVE_SEARCH_ACTION } from "../agent-actions/agentMapActionsCopy"
import { EmptyResultsSaveSearchCta } from "./EmptyResultsSaveSearchCta"
import { SearchStateMessage } from "./SearchStateMessage"

const toast = vi.hoisted(() => vi.fn())
const mockUseAuth = vi.hoisted(() => vi.fn())

const controlsState = vi.hoisted(() => ({
  nearbyRadiusMeters: 1_000,
  linePoints: [] as Array<{ lat: number; lng: number }>,
  lineDistanceMeters: 500,
}))

const interactionState = vi.hoisted(() => ({
  mode: "area" as "area" | "pin" | "line",
  selectedPin: null as { lat: number; lng: number } | null,
}))

const canvasState = vi.hoisted(() => ({
  searchedPlace: {
    name: "Bang Kapi",
    position: { lat: 13.7, lng: 100.6 },
  } as { name: string; position: { lat: number; lng: number } } | null,
  committedBounds: null as {
    northEast: { lat: number; lng: number }
    southWest: { lat: number; lng: number }
  } | null,
}))

const filtersState = vi.hoisted(() => ({
  submittedFilters: { minRent: 5_000 } as Record<string, number>,
}))

const modalPropsSpy = vi.hoisted(() =>
  vi.fn(
    ({
      isOpen,
      snapshot,
      onClose,
    }: {
      isOpen: boolean
      snapshot: { summaryTitle: string } | null
      onClose: () => void
    }) =>
      isOpen && snapshot ? (
        <div role="dialog">
          <span data-testid="modal-title">{snapshot.summaryTitle}</span>
          <button type="button" onClick={onClose}>
            Close modal
          </button>
        </div>
      ) : null,
  ),
)

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}))
vi.mock("@/hooks/use-toast", () => ({ toast }))
vi.mock("../../context/MapSearchSessionContext", () => ({
  useMapSearchControls: () => controlsState,
  useMapSearchCanvas: () => ({
    searchedPlace: canvasState.searchedPlace,
    committedBounds: canvasState.committedBounds,
  }),
}))
vi.mock("../../context/MapInteractionContext", () => ({
  useMapInteraction: () => ({
    mode: interactionState.mode,
    selectedPin: interactionState.selectedPin,
  }),
}))
vi.mock("../../context/MapSearchFilterContext", () => ({
  useMapSearchFilters: () => ({
    submittedFilters: filtersState.submittedFilters,
  }),
}))
vi.mock("../agent-actions/ConfirmCreateSavedSearchModal", () => ({
  ConfirmCreateSavedSearchModal: (
    props: Parameters<typeof modalPropsSpy>[0],
  ) => modalPropsSpy(props),
}))

const bounds = {
  northEast: { lat: 13.8, lng: 100.6 },
  southWest: { lat: 13.7, lng: 100.5 },
}

const activeAuth = {
  user: { status: "ACTIVE" },
  isAuthenticated: true,
  isLoading: false,
}

describe("EmptyResultsSaveSearchCta", () => {
  beforeEach(() => {
    toast.mockReset()
    modalPropsSpy.mockClear()
    mockUseAuth.mockReturnValue(activeAuth)
    interactionState.mode = "area"
    interactionState.selectedPin = null
    filtersState.submittedFilters = { minRent: 5_000 }
    canvasState.committedBounds = bounds
  })

  it("renders nothing for guests", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })

    const { container } = render(<EmptyResultsSaveSearchCta />)

    expect(container).toBeEmptyDOMElement()
  })

  it("opens the save-search wizard from committed search bounds", async () => {
    render(<EmptyResultsSaveSearchCta />)

    fireEvent.click(
      screen.getByRole("button", { name: MAP_SAVE_SEARCH_ACTION.title }),
    )

    await waitFor(() => {
      expect(modalPropsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          snapshot: expect.objectContaining({
            geoSearch: expect.objectContaining({
              mode: "area",
              bounds,
            }),
          }),
        }),
      )
    })
    expect(
      screen.getByText(MAP_SAVE_SEARCH_ACTION.emptyStateDescription),
    ).toBeInTheDocument()
  })

  it("toasts when there is no committed search area", () => {
    canvasState.committedBounds = null
    render(<EmptyResultsSaveSearchCta />)

    fireEvent.click(
      screen.getByRole("button", { name: MAP_SAVE_SEARCH_ACTION.title }),
    )

    expect(toast).toHaveBeenCalledWith({
      title: "Map area not ready",
      description: "Wait for the map to load, then try again.",
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("SearchStateMessage empty save CTA", () => {
  beforeEach(() => {
    canvasState.committedBounds = bounds
    mockUseAuth.mockReturnValue(activeAuth)
  })

  it("shows the save CTA on empty guest search results for eligible users", () => {
    render(<SearchStateMessage status="empty" searchSource="area" />)

    expect(
      screen.getByRole("button", { name: MAP_SAVE_SEARCH_ACTION.title }),
    ).toBeInTheDocument()
  })

  it("hides the save CTA while in listing search", () => {
    render(
      <SearchStateMessage
        status="empty"
        searchSource="area"
        isListingSearch
      />,
    )

    expect(
      screen.queryByRole("button", { name: MAP_SAVE_SEARCH_ACTION.title }),
    ).not.toBeInTheDocument()
  })

  it("hides the save CTA for guests", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })

    render(<SearchStateMessage status="empty" searchSource="area" />)

    expect(
      screen.queryByRole("button", { name: MAP_SAVE_SEARCH_ACTION.title }),
    ).not.toBeInTheDocument()
  })
})
