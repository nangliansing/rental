import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AgentMapActionsMenu } from "./AgentMapActionsMenu"

const toast = vi.hoisted(() => vi.fn())
const getCurrentBounds = vi.hoisted(() => vi.fn())
const onEnterListingSearch = vi.hoisted(() => vi.fn())
const onExitListingSearch = vi.hoisted(() => vi.fn())

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

vi.mock("@/hooks/use-toast", () => ({ toast }))
vi.mock("../../context/MapSearchSessionContext", () => ({
  useMapSearchControls: () => ({
    ...controlsState,
    onEnterListingSearch,
    onExitListingSearch,
  }),
  useMapSearchCanvas: () => ({
    searchedPlace: canvasState.searchedPlace,
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
vi.mock("./ConfirmCreateClientRequestModal", () => ({
  ConfirmCreateClientRequestModal: (
    props: Parameters<typeof modalPropsSpy>[0],
  ) => modalPropsSpy(props),
}))
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
  }: {
    children: ReactNode
    onSelect?: (event: Event) => void
  }) => (
    <button
      type="button"
      onClick={() => onSelect?.(new Event("select", { cancelable: true }))}
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

describe("AgentMapActionsMenu", () => {
  beforeEach(() => {
    toast.mockReset()
    onEnterListingSearch.mockReset()
    onExitListingSearch.mockReset()
    getCurrentBounds.mockReset()
    modalPropsSpy.mockClear()
    getCurrentBounds.mockReturnValue(bounds)

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
    filtersState.submittedFilters = { minRent: 5_000 }
  })

  describe("visibility", () => {
    it("renders nothing when the agent cannot create listings", () => {
      controlsState.canCreateListing = false

      const { container } = render(<AgentMapActionsMenu />)

      expect(container).toBeEmptyDOMElement()
      expect(
        screen.queryByTestId("agent-map-actions"),
      ).not.toBeInTheDocument()
    })

    it("renders the agent actions trigger when listing create is allowed", () => {
      render(<AgentMapActionsMenu />)

      expect(
        screen.getByRole("button", { name: "Agent map actions" }),
      ).toBeInTheDocument()
      expect(screen.getByTestId("agent-map-actions")).toBeInTheDocument()
    })
  })

  describe("listing mode toggle", () => {
    it("enters listing mode from the dropdown", () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText("Enter listing mode"))

      expect(onEnterListingSearch).toHaveBeenCalledOnce()
      expect(onExitListingSearch).not.toHaveBeenCalled()
    })

    it("exits listing mode when already listing", () => {
      controlsState.isListingSearch = true
      render(<AgentMapActionsMenu />)

      expect(screen.getByText("Exit listing mode")).toBeInTheDocument()
      fireEvent.click(screen.getByText("Exit listing mode"))

      expect(onExitListingSearch).toHaveBeenCalledOnce()
      expect(onEnterListingSearch).not.toHaveBeenCalled()
    })
  })

  describe("make a client request", () => {
    it("opens the confirm modal with the visible area snapshot", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText("Make a client request"))

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
      fireEvent.click(screen.getByText("Make a client request"))

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
      fireEvent.click(screen.getByText("Make a client request"))

      await waitFor(() => {
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
          "Search line",
        )
      })
      expect(screen.getByTestId("modal-geo-mode")).toHaveTextContent("line")
    })

    it("toasts when the map snapshot cannot be built", () => {
      getCurrentBounds.mockReturnValue(null)
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText("Make a client request"))

      expect(toast).toHaveBeenCalledWith({
        title: "Map area not ready",
        description: "Wait for the map to load, then try again.",
      })
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("closes the confirm modal through onClose", async () => {
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText("Make a client request"))
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole("button", { name: "Close modal" }))

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("passes live submitted filters into the modal", async () => {
      filtersState.submittedFilters = { minRent: 8_000, maxRent: 25_000 }
      render(<AgentMapActionsMenu />)

      fireEvent.click(screen.getByText("Make a client request"))

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
})
