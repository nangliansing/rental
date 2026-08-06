import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  EXPLORE_OPPORTUNITIES_ACTION,
} from "@/features/explore-opportunities-panel"

import { AgentMapActionsMenu } from "./AgentMapActionsMenu"
import {
  MAP_LISTING_MODE_ACTION,
  MAP_SAVE_SEARCH_ACTION,
} from "./agentMapActionsCopy"

const toast = vi.hoisted(() => vi.fn())
const getCurrentBounds = vi.hoisted(() => vi.fn())
const onEnterListingSearch = vi.hoisted(() => vi.fn())
const onExitListingSearch = vi.hoisted(() => vi.fn())
const mockUseAuth = vi.hoisted(() => vi.fn())

const controlsState = vi.hoisted(() => ({
  canCreateListing: true,
  isListingSearch: false,
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
      filters,
      onClose,
    }: {
      isOpen: boolean
      snapshot: { summaryTitle: string; geoSearch: { mode: string } } | null
      filters: Record<string, number>
      onClose: () => void
    }) =>
      isOpen && snapshot ? (
        <div role="dialog">
          <span data-testid="modal-title">{snapshot.summaryTitle}</span>
          <span data-testid="modal-geo-mode">{snapshot.geoSearch.mode}</span>
          <span data-testid="modal-min-rent">
            {filters.minRent ?? "none"}
          </span>
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
  useMapSearchControls: () => ({
    ...controlsState,
    onEnterListingSearch,
    onExitListingSearch,
  }),
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
vi.mock("../../hooks/useMapBounds", () => ({
  useMapBounds: () => ({ getCurrentBounds }),
}))
vi.mock("../../context/MapSearchFilterContext", () => ({
  useMapSearchFilters: () => ({
    submittedFilters: filtersState.submittedFilters,
  }),
}))
vi.mock("./ConfirmCreateSavedSearchModal", () => ({
  ConfirmCreateSavedSearchModal: (
    props: Parameters<typeof modalPropsSpy>[0],
  ) => modalPropsSpy(props),
}))
vi.mock("@/features/explore-opportunities-panel", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/explore-opportunities-panel")
  >("@/features/explore-opportunities-panel")

  return {
    ...actual,
    ExploreOpportunitiesPanelModal: ({
      isOpen,
      session,
      onClose,
    }: {
      isOpen: boolean
      session: {
        areaTitle: string
        demandArea: { type: string }
      } | null
      onClose: () => void
    }) =>
      isOpen && session ? (
        <div role="dialog" aria-label="explore-opportunities">
          <span data-testid="explore-modal-title">{session.areaTitle}</span>
          <span data-testid="explore-modal-kind">
            {session.demandArea.type}
          </span>
          <button type="button" onClick={onClose}>
            Close explore
          </button>
        </div>
      ) : null,
  }
})
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
}))
vi.mock("@/shared/utils/getModalRoot", () => ({
  getModalRoot: () => document.body,
}))
vi.mock("radix-ui", () => {
  const passthrough = ({ children }: { children: ReactNode }) => children
  const Trigger = ({
    children,
    asChild: _asChild,
    ...props
  }: {
    children: ReactNode
    asChild?: boolean
  } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  )
  const Item = ({
    children,
    onSelect,
    disabled,
  }: {
    children: ReactNode
    onSelect?: (event: Event) => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        onSelect?.(new Event("select", { cancelable: true }))
      }}
    >
      {children}
    </button>
  )

  return {
    DropdownMenu: {
      Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Trigger,
      Portal: passthrough,
      Content: ({ children }: { children: ReactNode }) => (
        <div role="menu">{children}</div>
      ),
      Item,
      Arrow: () => null,
    },
  }
})

const pin = { lat: 13.7563, lng: 100.5018 }
const linePoints = [
  { lat: 13.75, lng: 100.5 },
  { lat: 13.76, lng: 100.52 },
]
const bounds = {
  northEast: { lat: 13.8, lng: 100.6 },
  southWest: { lat: 13.7, lng: 100.5 },
}

const activeAuth = {
  user: { status: "ACTIVE" },
  isAuthenticated: true,
  isLoading: false,
}

describe("AgentMapActionsMenu", () => {
  beforeEach(() => {
    toast.mockReset()
    onEnterListingSearch.mockReset()
    onExitListingSearch.mockReset()
    getCurrentBounds.mockReset()
    modalPropsSpy.mockClear()
    getCurrentBounds.mockReturnValue(bounds)
    mockUseAuth.mockReturnValue(activeAuth)

    controlsState.canCreateListing = true
    controlsState.isListingSearch = false
    controlsState.nearbyRadiusMeters = 1_000
    controlsState.linePoints = []
    controlsState.lineDistanceMeters = 500

    interactionState.mode = "area"
    interactionState.selectedPin = null

    canvasState.searchedPlace = {
      name: "Bang Kapi",
      position: { lat: 13.7, lng: 100.6 },
    }
    canvasState.committedBounds = null
    filtersState.submittedFilters = { minRent: 5_000 }
  })

  describe("visibility", () => {
    it("renders nothing when the user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })

      const { container } = render(<AgentMapActionsMenu />)

      expect(container).toBeEmptyDOMElement()
      expect(
        screen.queryByTestId("agent-map-actions"),
      ).not.toBeInTheDocument()
    })

    it("renders for an active authenticated user without a lister profile", () => {
      controlsState.canCreateListing = false
      render(<AgentMapActionsMenu />)

      expect(
        screen.getByRole("button", { name: "Map actions" }),
      ).toBeInTheDocument()
      expect(screen.getByTestId("agent-map-actions")).toBeInTheDocument()
      expect(
        screen.getByText(MAP_SAVE_SEARCH_ACTION.title),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(EXPLORE_OPPORTUNITIES_ACTION.title),
      ).not.toBeInTheDocument()
    })

    it("renders the map actions trigger when listing create is allowed", () => {
      render(<AgentMapActionsMenu />)

      expect(
        screen.getByRole("button", { name: "Map actions" }),
      ).toBeInTheDocument()
      expect(screen.getByTestId("agent-map-actions")).toBeInTheDocument()
    })
  })

  describe("listing mode toggle", () => {
    it("enters listing mode from the dropdown", () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_LISTING_MODE_ACTION.enterTitle))

      expect(onEnterListingSearch).toHaveBeenCalledOnce()
      expect(onExitListingSearch).not.toHaveBeenCalled()
    })

    it("exits listing mode when already listing", () => {
      controlsState.isListingSearch = true
      render(<AgentMapActionsMenu />)

      expect(
        screen.getByText(MAP_LISTING_MODE_ACTION.exitTitle),
      ).toBeInTheDocument()
      fireEvent.click(screen.getByText(MAP_LISTING_MODE_ACTION.exitTitle))

      expect(onExitListingSearch).toHaveBeenCalledOnce()
      expect(onEnterListingSearch).not.toHaveBeenCalled()
    })

    it("mutes enter listing mode when the user has no agent profile", () => {
      controlsState.canCreateListing = false
      render(<AgentMapActionsMenu />)

      const listingAction = screen.getByText(MAP_LISTING_MODE_ACTION.enterTitle)
        .closest("button")
      expect(listingAction).toBeDisabled()
      expect(
        screen.getByText(MAP_LISTING_MODE_ACTION.requiresProfileDescription),
      ).toBeInTheDocument()

      fireEvent.click(listingAction!)

      expect(onEnterListingSearch).not.toHaveBeenCalled()
    })
  })

  describe("save this search", () => {
    it("opens the confirm modal with the visible area snapshot", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })
      expect(screen.getByTestId("modal-title")).toHaveTextContent(
        "Visible map area",
      )
      expect(screen.getByTestId("modal-geo-mode")).toHaveTextContent("area")
      expect(screen.getByTestId("modal-min-rent")).toHaveTextContent("5000")
    })

    it("opens the confirm modal with a nearby pin snapshot", async () => {
      interactionState.mode = "pin"
      interactionState.selectedPin = pin
      controlsState.nearbyRadiusMeters = 1_000

      render(<AgentMapActionsMenu />)
      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      await waitFor(() => {
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
          "Pinned location",
        )
      })
      expect(screen.getByTestId("modal-geo-mode")).toHaveTextContent("nearby")
    })

    it("opens the confirm modal with a line snapshot", async () => {
      interactionState.mode = "line"
      controlsState.linePoints = linePoints
      controlsState.lineDistanceMeters = 500

      render(<AgentMapActionsMenu />)
      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      await waitFor(() => {
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
          "Search line",
        )
      })
      expect(screen.getByTestId("modal-geo-mode")).toHaveTextContent("line")
    })

    it("toasts when the map snapshot cannot be built", () => {
      getCurrentBounds.mockReturnValue(null)
      canvasState.committedBounds = null
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      expect(toast).toHaveBeenCalledWith({
        title: "Map area not ready",
        description: "Wait for the map to load, then try again.",
      })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("falls back to committed search bounds when live bounds are missing", async () => {
      getCurrentBounds.mockReturnValue(null)
      canvasState.committedBounds = bounds
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })
      expect(toast).not.toHaveBeenCalled()
      expect(screen.getByTestId("modal-geo-mode")).toHaveTextContent("area")
    })

    it("closes the confirm modal through onClose", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: "Close modal" }))

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("passes live submitted filters into the modal", async () => {
      filtersState.submittedFilters = { minRent: 8_000, maxRent: 25_000 }
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(MAP_SAVE_SEARCH_ACTION.title))

      await waitFor(() => {
        expect(modalPropsSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            isOpen: true,
            filters: { minRent: 8_000, maxRent: 25_000 },
          }),
        )
      })
    })
  })

  describe("explore opportunities", () => {
    it("shows the action when the viewer has an agent profile", () => {
      render(<AgentMapActionsMenu />)

      expect(
        screen.getByText(EXPLORE_OPPORTUNITIES_ACTION.title),
      ).toBeInTheDocument()
      expect(
        screen.getByText(EXPLORE_OPPORTUNITIES_ACTION.description),
      ).toBeInTheDocument()
    })

    it("opens a coordinates preview for the selected area", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(EXPLORE_OPPORTUNITIES_ACTION.title))

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "explore-opportunities" }),
        ).toBeInTheDocument()
      })
      expect(screen.getByTestId("explore-modal-title")).toHaveTextContent(
        "Visible map area",
      )
      expect(screen.getByTestId("explore-modal-kind")).toHaveTextContent(
        "Polygon",
      )
    })

    it("closes the explore preview through onClose", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText(EXPLORE_OPPORTUNITIES_ACTION.title))
      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "explore-opportunities" }),
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: "Close explore" }))

      expect(
        screen.queryByRole("dialog", { name: "explore-opportunities" }),
      ).not.toBeInTheDocument()
    })
  })
})
