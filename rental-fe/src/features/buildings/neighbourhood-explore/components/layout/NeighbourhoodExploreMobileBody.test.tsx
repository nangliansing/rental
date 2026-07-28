import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"
import { renderWithProviders } from "@/test/renderWithProviders"
import {
  getDraggableBottomDrawerMetrics,
} from "@/shared/components/navigation/draggable-bottom-drawer.utils"

import { NeighbourhoodExploreProvider } from "../../NeighbourhoodExploreProvider"
import { useNeighbourhoodExploreSelection } from "../../NeighbourhoodExploreContext"
import { NeighbourhoodExploreMobileBody } from "./NeighbourhoodExploreMobileBody"

vi.mock("./NeighbourhoodExploreMapStack", () => ({
  NeighbourhoodExploreMapStack: () => <div data-testid="map-stack" />,
}))

vi.mock("../list/NeighbourhoodPlaceListPanel", () => ({
  NeighbourhoodPlaceListPanel: () => <div data-testid="list-panel">List panel</div>,
}))

const BUILDING_ID = "building-1"
const TEST_VIEWPORT_HEIGHT = 800

function mockNeighbourhoodResponse() {
  server.use(
    http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
      HttpResponse.json({
        success: true,
        data: {
          buildingId: BUILDING_ID,
          origin: { lat: 13.765, lng: 100.641 },
          radiusMeters: 1000,
          fetchRadiusMeters: 2000,
          fetchedAt: "2026-07-26T19:17:15.805Z",
          cacheStatus: "hit",
          source: "openstreetmap",
          summary: { all: 1, convenience: 1 },
          categories: [
            {
              key: "convenience",
              label: "Convenience Stores",
              priority: 2,
              count: 1,
            },
          ],
          places: [
            {
              id: "place-convenience",
              name: "7-Eleven",
              lat: 13.761819,
              lng: 100.640989,
              category: "convenience",
              distanceMeters: 354,
            },
          ],
        },
      }),
    ),
  )
}

function mockPointerCapture(element: HTMLElement) {
  element.setPointerCapture = vi.fn()
  element.releasePointerCapture = vi.fn()
  element.hasPointerCapture = vi.fn(() => true)
}

async function dragDrawerDown(user: ReturnType<typeof userEvent.setup>) {
  const dragRegion = screen.getByText("Nearby places").closest(".cursor-grab")

  if (!dragRegion) {
    throw new Error("Expected drawer drag region")
  }

  mockPointerCapture(dragRegion)

  await user.pointer([
    {
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 0, clientY: 120 },
    },
    { coords: { clientX: 0, clientY: 340 } },
    { keys: "[/MouseLeft]" },
  ])
}

async function dragDrawerUp(user: ReturnType<typeof userEvent.setup>) {
  const dragRegion = screen.getByText("Nearby places").closest(".cursor-grab")

  if (!dragRegion) {
    throw new Error("Expected drawer drag region")
  }

  mockPointerCapture(dragRegion)

  await user.pointer([
    {
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 0, clientY: 200 },
    },
    { coords: { clientX: 0, clientY: 10 } },
    { keys: "[/MouseLeft]" },
  ])
}

function getDrawerListContent() {
  const listPanel = screen.getByTestId("list-panel")

  return listPanel.closest(".overflow-y-auto")
}

function SelectPlaceTrigger() {
  const { selectPlace } = useNeighbourhoodExploreSelection()

  return (
    <button type="button" onClick={() => selectPlace("place-convenience")}>
      Select place
    </button>
  )
}

function renderMobileBody() {
  return renderWithProviders(
    <NeighbourhoodExploreProvider buildingId={BUILDING_ID} enabled>
      <SelectPlaceTrigger />
      <NeighbourhoodExploreMobileBody />
    </NeighbourhoodExploreProvider>,
  )
}

describe("NeighbourhoodExploreMobileBody", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    )

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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("starts at the half drawer snap with the list visible", async () => {
    mockNeighbourhoodResponse()
    renderMobileBody()

    await waitFor(() => {
      expect(screen.getByTestId("list-panel")).toBeInTheDocument()
    })

    const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

    expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveStyle({
      transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
    })
    expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveAttribute(
      "data-snap",
      "half",
    )
  })

  it("expands the drawer from peek to half when a place is selected", async () => {
    mockNeighbourhoodResponse()
    const { user } = renderMobileBody()

    await waitFor(() => {
      expect(screen.getByTestId("list-panel")).toBeInTheDocument()
    })

    await dragDrawerDown(user)

    const metrics = getDraggableBottomDrawerMetrics(TEST_VIEWPORT_HEIGHT)

    await waitFor(() => {
      expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveAttribute(
        "data-snap",
        "peek",
      )
      expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.peek}px, 0)`,
      })
    })

    await user.click(screen.getByRole("button", { name: "Select place" }))

    await waitFor(() => {
      expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveAttribute(
        "data-snap",
        "half",
      )
      expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveStyle({
        transform: `translate3d(0, ${metrics.snapOffsets.half}px, 0)`,
      })
    })
  })

  it("keeps the list visible when expanding from half to full", async () => {
    mockNeighbourhoodResponse()
    const { user } = renderMobileBody()

    await waitFor(() => {
      expect(screen.getByTestId("list-panel")).toBeInTheDocument()
    })

    expect(getDrawerListContent()).not.toHaveClass("invisible")

    await dragDrawerUp(user)

    await waitFor(() => {
      expect(screen.getByTestId("neighbourhood-explore-results-drawer")).toHaveAttribute(
        "data-snap",
        "full",
      )
    })

    expect(getDrawerListContent()).not.toHaveClass("invisible")
  })
})
