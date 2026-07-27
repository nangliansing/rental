import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useMapSearchControls } from "../context/MapSearchSessionContext"
import { useMapInteraction } from "../context/MapInteractionContext"
import { useMapBounds } from "../hooks/useMapBounds"
import { useMapSearchMap } from "../hooks/useMapSearchMap"
import { useCurrentLocation } from "../hooks/useCurrentLocation"
import { SearchAreaButton } from "./SearchAreaButton"

vi.mock("../hooks/useMapSearchMap")
vi.mock("../context/MapSearchSessionContext")
vi.mock("../context/MapInteractionContext")
vi.mock("../hooks/useMapBounds")
vi.mock("../hooks/useCurrentLocation")

describe("SearchAreaButton", () => {
  beforeEach(() => {
    vi.mocked(useMapSearchMap).mockReturnValue(null)
    vi.mocked(useMapBounds).mockReturnValue({
      getCurrentBounds: vi.fn(),
    } as never)
    vi.mocked(useCurrentLocation).mockReturnValue({
      status: "idle",
      error: null,
      requestLocation: vi.fn(),
      clearError: vi.fn(),
    } as never)
    vi.mocked(useMapSearchControls).mockReturnValue({
      isSearchingArea: false,
      isSearchingNearby: false,
      isSearchActionVisible: true,
      searchStatus: "idle",
      selectedPin: null,
      nearbyRadiusMeters: 1_000,
      linePoints: [],
      lineDistanceMeters: 1_000,
      isSearchingLine: false,
      onSearchArea: vi.fn(),
      onDropPin: vi.fn(),
      onCurrentLocationFound: vi.fn(),
      onSearchNearby: vi.fn(),
      onClearPin: vi.fn(),
      onNearbyRadiusChange: vi.fn(),
      onToggleLineMode: vi.fn(),
      onUndoLinePoint: vi.fn(),
      onLineDistanceChange: vi.fn(),
      onSearchLine: vi.fn(),
    } as never)
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "area",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    } as never)
  })

  it("shows one primary area action and vertically grouped mode controls", () => {
    render(<SearchAreaButton />)

    expect(screen.getByRole("button", { name: "Search this area" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Search within 1 km" })).not.toBeInTheDocument()
    expect(screen.getByTestId("map-mode-controls")).toHaveClass("flex-col")
    expect(screen.getByRole("button", { name: "Use my location" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Drop pin" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Draw search line" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Search radius: 1 km" })).not.toBeInTheDocument()
  })

  it("shows drawing guidance and enables line search after two points", () => {
    const onSearchLine = vi.fn()
    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      linePoints: [
        { lat: 13.7, lng: 100.6 },
        { lat: 13.8, lng: 100.7 },
      ],
      onSearchLine,
    } as never)
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "line",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    } as never)

    render(<SearchAreaButton />)

    const searchButton = screen.getByRole("button", {
      name: "Search within 1 km of line",
    })
    expect(searchButton).toBeEnabled()
    fireEvent.click(searchButton)
    expect(onSearchLine).toHaveBeenCalledOnce()
    expect(vi.mocked(useMapSearchControls)().onSearchArea).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Undo last line point" })).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Exit line search mode" }),
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Clear search line" })).not.toBeInTheDocument()
  })

  it("guides line point placement before enabling search", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "line",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    } as never)

    const { unmount } = render(<SearchAreaButton />)

    const startingPointButton = screen.getByRole("button", {
      name: "Place starting point",
    })
    expect(startingPointButton).toBeDisabled()
    expect(startingPointButton).toHaveAccessibleDescription(
      "Place a starting point on the map before searching.",
    )

    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      linePoints: [{ lat: 13.7, lng: 100.6 }],
    } as never)
    unmount()
    render(<SearchAreaButton />)

    expect(
      screen.getByRole("button", { name: "Place another point" }),
    ).toBeDisabled()
  })

  it("labels a stale submitted line as ready to update", () => {
    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      linePoints: [
        { lat: 13.7, lng: 100.6 },
        { lat: 13.8, lng: 100.7 },
      ],
      searchStatus: "stale",
    } as never)
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "line",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    } as never)

    render(<SearchAreaButton />)

    expect(
      screen.getByRole("button", { name: "Search updated line" }),
    ).toBeEnabled()
  })

  it("switches the single primary action and pin toggle in pin mode", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "pin",
      selectedPin: { lat: 13.7, lng: 100.6 },
      currentLocation: null,
      pinSource: "manual",
    } as never)

    render(<SearchAreaButton />)

    expect(screen.getByRole("button", { name: "Search within 1 km" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Search this area" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove pin" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Search radius: 1 km" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Search radius: 1 km" })).toHaveClass(
      "h-11",
      "w-11",
    )
  })

  it("moves the mode controls beside the desktop results panel", () => {
    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      searchStatus: "success",
    } as never)

    render(<SearchAreaButton />)

    expect(screen.getByTestId("map-mode-controls")).toHaveClass(
      "lg:right-[448px]",
    )
  })

  it("fades and disables the primary action when the current search is fresh", () => {
    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      isSearchActionVisible: false,
    } as never)

    render(<SearchAreaButton />)

    const button = screen.getByRole("button", { name: "Search this area", hidden: true })
    expect(button).toBeDisabled()
    expect(button.parentElement).toHaveClass("opacity-0", "-translate-y-1")
  })

  it("changes the nearby radius from pin mode presets", () => {
    const onNearbyRadiusChange = vi.fn()
    vi.mocked(useMapSearchControls).mockReturnValue({
      ...vi.mocked(useMapSearchControls)(),
      onNearbyRadiusChange,
    } as never)
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "pin",
      selectedPin: { lat: 13.7, lng: 100.6 },
      currentLocation: null,
      pinSource: "manual",
    } as never)

    render(<SearchAreaButton />)
    fireEvent.click(screen.getByRole("button", { name: "Search radius: 1 km" }))
    fireEvent.click(screen.getByRole("button", { name: "1.5 km" }))

    expect(onNearbyRadiusChange).toHaveBeenCalledWith(1_500)
  })
})
