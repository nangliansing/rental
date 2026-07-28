import type { ReactNode, Ref } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
  DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
  getDraggableBottomDrawerMetrics,
} from "@/shared/components/navigation/draggable-bottom-drawer.utils"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { useMapSearchResults } from "../../context/MapSearchSessionContext"
import type { SearchBuilding } from "../../types"
import { BuildingResultsPanel } from "./BuildingResultsPanel"

vi.mock("../../context/BuildingDetailSessionContext", () => ({
  BuildingDetailSessionProvider: ({
    children,
  }: {
    children: ReactNode
  }) => children,
}))

vi.mock("@/hooks/useMediaQuery")
vi.mock("../../context/MapSearchFilterContext")
vi.mock("../../context/MapSearchSessionContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../context/MapSearchSessionContext")
  >("../../context/MapSearchSessionContext")

  return {
    ...actual,
    useMapSearchResults: vi.fn(),
  }
})

vi.mock("../filters/FilterBar", () => ({
  FilterBar: ({
    onOpenFilters,
    triggerRef,
  }: {
    onOpenFilters: () => void
    triggerRef?: Ref<HTMLButtonElement>
  }) => (
    <button ref={triggerRef} type="button" onClick={onOpenFilters}>
      Filters
    </button>
  ),
}))

vi.mock("../filters/FilterConfigPage", () => ({
  FilterConfigPage: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      Back from filters
    </button>
  ),
}))

vi.mock("./BuildingListPage", () => ({
  BuildingListPage: ({
    onBuildingSelect,
  }: {
    onBuildingSelect?: (building: SearchBuilding) => void
  }) => (
    <button
      type="button"
      data-building-trigger="building-1"
      onClick={() =>
        onBuildingSelect?.({
          _id: "building-1",
          name: "Building one",
        } as SearchBuilding)
      }
    >
      Building one
    </button>
  ),
}))

vi.mock("./BuildingDetailPage", () => ({
  BuildingDetailPage: ({ onBack }: { onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      Back from building
    </button>
  ),
}))

const building = { _id: "building-1", name: "Building one" }

const sessionDefaults = {
  searchStatus: "success" as const,
  buildings: [building],
  selectedBuilding: null as SearchBuilding | null,
  selectedPin: null,
  searchSource: "area" as const,
  isListingSearch: false,
  canCreateListing: false,
  onSearchAgain: vi.fn(),
  onExitListingSearch: vi.fn(),
  onBuildingSelect: vi.fn(),
  onListingSelect: vi.fn(),
  onListingClose: vi.fn(),
  onBuildingHoverChange: vi.fn(),
  onListNewBuilding: vi.fn(),
  pendingBuildingId: null,
  pendingListingId: null,
  isPendingBuildingUnresolved: false,
}

function mockResultsSession(overrides: Record<string, unknown> = {}) {
  vi.mocked(useMapSearchResults).mockImplementation(
    () =>
      ({
        ...sessionDefaults,
        ...overrides,
      }) as never,
  )
}

function renderPanel() {
  return render(<BuildingResultsPanel />)
}

describe("BuildingResultsPanel focus management", () => {
  beforeEach(() => {
    vi.mocked(useMediaQuery).mockReturnValue(false)
    vi.mocked(useMapSearchFilters).mockReturnValue({
      selectedListers: [],
      removeLister: vi.fn(),
    } as never)
    mockResultsSession()
  })

  it("focuses the filter page heading and restores the filter trigger on mobile", async () => {
    const user = userEvent.setup()
    renderPanel()
    const mobilePanel = screen.getByTestId("results-panel-mobile")

    const filterTrigger = within(mobilePanel).getByRole("button", {
      name: "Filters",
    })
    await user.click(filterTrigger)

    await waitFor(() =>
      expect(
        within(mobilePanel).getByRole("heading", { name: "Rental filters" }),
      ).toHaveFocus(),
    )

    await user.click(
      within(mobilePanel).getByRole("button", { name: "Back from filters" }),
    )

    await waitFor(() =>
      expect(
        within(mobilePanel).getByRole("button", { name: "Filters" }),
      ).toHaveFocus(),
    )
  })

  it("focuses the filter page heading and restores the filter trigger on desktop", async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true)
    const user = userEvent.setup()
    renderPanel()
    const desktopPanel = screen.getByTestId("results-panel-desktop")

    const filterTrigger = within(desktopPanel).getByRole("button", {
      name: "Filters",
    })
    await user.click(filterTrigger)

    await waitFor(() =>
      expect(
        within(desktopPanel).getByRole("heading", { name: "Rental filters" }),
      ).toHaveFocus(),
    )

    await user.click(
      within(desktopPanel).getByRole("button", { name: "Back from filters" }),
    )

    await waitFor(() =>
      expect(
        within(desktopPanel).getByRole("button", { name: "Filters" }),
      ).toHaveFocus(),
    )
  })

  it("focuses the building detail heading and restores the building trigger", async () => {
    const user = userEvent.setup()
    let selectedBuilding: SearchBuilding | null = null
    const onBuildingSelect = vi.fn((nextBuilding: SearchBuilding | null) => {
      selectedBuilding = nextBuilding
      mockResultsSession({ selectedBuilding })
    })

    mockResultsSession({ onBuildingSelect })
    const view = renderPanel()
    const mobilePanel = screen.getByTestId("results-panel-mobile")
    const buildingTrigger = within(mobilePanel).getByRole("button", {
      name: "Building one",
    })

    await user.click(buildingTrigger)
    view.rerender(<BuildingResultsPanel />)

    await waitFor(() =>
      expect(
        within(mobilePanel).getByRole("heading", {
          name: "Building one details",
        }),
      ).toHaveFocus(),
    )

    await user.click(
      within(mobilePanel).getByRole("button", { name: "Back from building" }),
    )
    view.rerender(<BuildingResultsPanel />)

    await waitFor(() =>
      expect(
        within(mobilePanel).getByRole("button", { name: "Building one" }),
      ).toHaveFocus(),
    )
  })

  it("restores building trigger focus from the mobile header back button", async () => {
    const user = userEvent.setup()
    let selectedBuilding: SearchBuilding | null = null
    const onBuildingSelect = vi.fn((nextBuilding: SearchBuilding | null) => {
      selectedBuilding = nextBuilding
      mockResultsSession({ selectedBuilding })
    })

    mockResultsSession({ onBuildingSelect })
    const view = renderPanel()
    const mobilePanel = screen.getByTestId("results-panel-mobile")
    const buildingTrigger = within(mobilePanel).getByRole("button", {
      name: "Building one",
    })

    await user.click(buildingTrigger)
    view.rerender(<BuildingResultsPanel />)

    await user.click(
      within(mobilePanel).getByRole("button", { name: "Go back" }),
    )
    view.rerender(<BuildingResultsPanel />)

    await waitFor(() =>
      expect(
        within(mobilePanel).getByRole("button", { name: "Building one" }),
      ).toHaveFocus(),
    )
  })
})

function mockMobilePanelPointerCapture(panel: HTMLElement) {
  const dragRegion = panel.querySelector(".cursor-grab")
  if (!(dragRegion instanceof HTMLElement)) {
    throw new Error("Expected mobile panel drag region")
  }

  dragRegion.setPointerCapture = vi.fn()
  dragRegion.releasePointerCapture = vi.fn()
  dragRegion.hasPointerCapture = vi.fn(() => true)

  return dragRegion
}

describe("BuildingResultsPanel mobile drawer", () => {
  const TEST_VIEWPORT_HEIGHT = 800

  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    )
    vi.stubGlobal("cancelAnimationFrame", vi.fn())

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: TEST_VIEWPORT_HEIGHT,
    })
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: TEST_VIEWPORT_HEIGHT,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })

    vi.mocked(useMediaQuery).mockReturnValue(false)
    vi.mocked(useMapSearchFilters).mockReturnValue({
      selectedListers: [],
      removeLister: vi.fn(),
    } as never)
    mockResultsSession()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("exposes an accessible label on the mobile drawer", () => {
    renderPanel()

    expect(
      screen.getByLabelText("Building search results"),
    ).toBeInTheDocument()
  })

  it("starts at half height and expands to full on upward drag", async () => {
    const user = userEvent.setup()
    renderPanel()

    const mobilePanel = screen.getByTestId("results-panel-mobile")
    const dragRegion = mockMobilePanelPointerCapture(mobilePanel)
    const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

    expect(mobilePanel).toHaveClass(DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS)
    expect(mobilePanel).toHaveStyle({
      transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
    })
    expect(mobilePanel).toHaveAttribute("data-snap", "half")

    await user.pointer([
      {
        keys: "[MouseLeft>]",
        target: dragRegion,
        coords: { clientX: 0, clientY: 220 },
      },
      { coords: { clientX: 0, clientY: 20 } },
      { keys: "[/MouseLeft]" },
    ])

    expect(mobilePanel).toHaveStyle({
      transform: `translate3d(0, ${metrics.snapOffsets.full}px, 0)`,
    })
    expect(mobilePanel).toHaveAttribute("data-snap", "full")
  })

  it("collapses to peek on downward drag from half", async () => {
    const user = userEvent.setup()
    renderPanel()

    const mobilePanel = screen.getByTestId("results-panel-mobile")
    const dragRegion = mockMobilePanelPointerCapture(mobilePanel)
    const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

    await user.pointer([
      {
        keys: "[MouseLeft>]",
        target: dragRegion,
        coords: { clientX: 0, clientY: 140 },
      },
      { coords: { clientX: 0, clientY: 340 } },
      { keys: "[/MouseLeft]" },
    ])

    expect(mobilePanel).toHaveStyle({
      transform: `translate3d(0, ${metrics.snapOffsets.peek}px, 0)`,
    })
    expect(mobilePanel).toHaveAttribute("data-snap", "peek")
    expect(within(mobilePanel).getByText("Building one")).toBeInTheDocument()
    expect(
      within(mobilePanel).getByText("Building one").closest(".overflow-y-auto"),
    ).toHaveAttribute("aria-hidden", "true")
  })

  it("does not start a drag from the header back button", async () => {
    const user = userEvent.setup()
    let selectedBuilding: SearchBuilding | null = null
    const onBuildingSelect = vi.fn((nextBuilding: SearchBuilding | null) => {
      selectedBuilding = nextBuilding
      mockResultsSession({ selectedBuilding })
    })

    mockResultsSession({ onBuildingSelect })
    const view = renderPanel()
    const mobilePanel = screen.getByTestId("results-panel-mobile")
    const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

    await user.click(
      within(mobilePanel).getByRole("button", { name: "Building one" }),
    )
    view.rerender(<BuildingResultsPanel />)

    const backButton = within(mobilePanel).getByRole("button", {
      name: "Go back",
    })
    mockMobilePanelPointerCapture(mobilePanel)

    await user.pointer([
      {
        keys: "[MouseLeft>]",
        target: backButton,
        coords: { clientX: 0, clientY: 200 },
      },
      { coords: { clientX: 0, clientY: 120 } },
      { keys: "[/MouseLeft]" },
    ])

    expect(mobilePanel).toHaveStyle({
      transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
    })
    expect(mobilePanel).toHaveAttribute("data-snap", "half")
  })
})
