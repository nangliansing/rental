import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"
import { renderWithProviders } from "@/test/renderWithProviders"

import { NeighbourhoodExploreProvider } from "../NeighbourhoodExploreProvider"
import { NeighbourhoodExploreBody } from "./NeighbourhoodExploreBody"

vi.mock("./layout/NeighbourhoodExploreDesktopBody", () => ({
  NeighbourhoodExploreDesktopBody: () => <div data-testid="desktop-body" />,
}))

vi.mock("./layout/NeighbourhoodExploreMobileBody", () => ({
  NeighbourhoodExploreMobileBody: () => <div data-testid="mobile-body" />,
}))

vi.mock("./NeighbourhoodExploreCategoryBar", () => ({
  NeighbourhoodExploreCategoryBar: () => <div data-testid="category-bar" />,
}))

const BUILDING_ID = "building-1"

function mockNeighbourhoodResponse(
  places: Array<Record<string, unknown>> = [
    {
      id: "place-convenience",
      name: "7-Eleven",
      lat: 13.761819,
      lng: 100.640989,
      category: "convenience",
      distanceMeters: 354,
    },
  ],
) {
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
          summary: { all: places.length, convenience: places.length },
          categories:
            places.length > 0
              ? [
                  {
                    key: "convenience",
                    label: "Convenience Stores",
                    priority: 2,
                    count: places.length,
                  },
                ]
              : [],
          places,
        },
      }),
    ),
  )
}

function mockMatchMedia(matchesDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string): MediaQueryList => ({
    matches: query.includes("768px") ? matchesDesktop : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }))
}

function renderBody() {
  return renderWithProviders(
    <NeighbourhoodExploreProvider buildingId={BUILDING_ID} enabled>
      <NeighbourhoodExploreBody />
    </NeighbourhoodExploreProvider>,
  )
}

describe("NeighbourhoodExploreBody", () => {
  it("renders the desktop layout when the viewport is wide enough", async () => {
    mockMatchMedia(true)
    mockNeighbourhoodResponse()

    renderBody()

    await waitFor(() => {
      expect(screen.getByTestId("desktop-body")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("mobile-body")).not.toBeInTheDocument()
  })

  it("renders the mobile layout on small viewports", async () => {
    mockMatchMedia(false)
    mockNeighbourhoodResponse()

    renderBody()

    await waitFor(() => {
      expect(screen.getByTestId("mobile-body")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("desktop-body")).not.toBeInTheDocument()
  })

  it("shows an empty state when neighbourhood data has no places", async () => {
    mockMatchMedia(true)
    mockNeighbourhoodResponse([])

    renderBody()

    await waitFor(() => {
      expect(screen.getByText("No nearby places found")).toBeInTheDocument()
    })

    expect(screen.getByTestId("category-bar")).toBeInTheDocument()
    expect(screen.queryByTestId("desktop-body")).not.toBeInTheDocument()
  })

  it("shows a retryable error state when the request fails", async () => {
    mockMatchMedia(true)
    server.use(
      http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    )

    renderBody()

    await waitFor(() => {
      expect(
        screen.getByText("Could not load nearby places"),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
  })
})
