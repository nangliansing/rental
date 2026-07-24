import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cancelPredictionRequest: vi.fn(),
  clearPredictionError: vi.fn(),
  clearPredictions: vi.fn(),
  getPredictions: vi.fn(),
  searchAgentProfiles: vi.fn(),
  searchPlace: vi.fn(),
  selectPrediction: vi.fn(),
}))

vi.mock("@/features/agent", () => ({
  searchAgentProfiles: mocks.searchAgentProfiles,
}))

vi.mock("../../context/MapSearchFilterContext", () => ({
  useMapSearchFilters: () => ({
    selectedListerIds: [],
    toggleLister: vi.fn(),
  }),
}))

vi.mock("../../context/MapSearchSessionContext", () => ({
  useMapSearchPlace: () => ({
    searchedPlace: null,
    onPlaceFound: vi.fn(),
    onPlaceSearchOpenChange: vi.fn(),
  }),
}))

vi.mock("../../hooks/usePlaceSearch", () => ({
  usePlaceSearch: () => ({
    predictions: [],
    predictionError: null,
    cancelPredictionRequest: mocks.cancelPredictionRequest,
    clearPredictionError: mocks.clearPredictionError,
    clearPredictions: mocks.clearPredictions,
    getPredictions: mocks.getPredictions,
    searchPlace: mocks.searchPlace,
    selectPrediction: mocks.selectPrediction,
  }),
}))

vi.mock("./DesktopPlaceSearchCombobox", () => ({
  DesktopPlaceSearchCombobox: ({
    isListerSearchLoading,
    listers,
    listerSearchError,
    onInputChange,
    onRetryListerSearch,
    onSearch,
    onSearchModeChange,
  }: {
    isListerSearchLoading: boolean
    listers: unknown[]
    listerSearchError: string | null
    onInputChange: (value: string) => void
    onRetryListerSearch: () => void
    onSearch: () => void
    onSearchModeChange: (mode: "places" | "listers") => void
  }) => (
    <div>
      <output aria-label="Agent search status">
        {isListerSearchLoading ? "Loading" : "Idle"}
      </output>
      <output aria-label="Agent result count">{listers.length}</output>
      {listerSearchError && (
        <div role="alert">
          {listerSearchError}
          <button type="button" onClick={onRetryListerSearch}>
            Try again
          </button>
        </div>
      )}
      <button type="button" onClick={() => onSearchModeChange("listers")}>
        Agents
      </button>
      <button type="button" onClick={() => onSearchModeChange("places")}>
        Places
      </button>
      <button type="button" onClick={onSearch}>
        Search
      </button>
      <input
        aria-label="Search"
        onChange={(event) => onInputChange(event.target.value)}
      />
    </div>
  ),
}))

vi.mock("./MobilePlaceSearchButton", () => ({
  MobilePlaceSearchButton: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      Open mobile search
    </button>
  ),
}))

vi.mock("./MobilePlaceSearchOverlay", () => ({
  MobilePlaceSearchOverlay: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Close mobile search
    </button>
  ),
}))

import { PlaceSearch } from "./PlaceSearch"
import { TYPEAHEAD_DEBOUNCE_MS } from "./search.constants"

describe("PlaceSearch typeahead", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.cancelPredictionRequest.mockReset()
    mocks.clearPredictionError.mockReset()
    mocks.clearPredictions.mockReset()
    mocks.getPredictions.mockReset().mockResolvedValue(undefined)
    mocks.searchAgentProfiles.mockReset().mockResolvedValue([])
    mocks.searchPlace.mockReset().mockResolvedValue(undefined)
    mocks.selectPrediction.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("sends only the latest Google query after rapid typing stops", async () => {
    render(<PlaceSearch />)

    const input = screen.getByRole("textbox", { name: "Search" })
    fireEvent.change(input, { target: { value: "Ba" } })
    fireEvent.change(input, { target: { value: "Bang" } })
    fireEvent.change(input, { target: { value: "Bangkok" } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS - 1)
    })
    expect(mocks.getPredictions).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(mocks.getPredictions).toHaveBeenCalledTimes(1)
    expect(mocks.getPredictions).toHaveBeenCalledWith("Bangkok")
  })

  it("does not forward a too-short location query to prediction search", async () => {
    render(<PlaceSearch />)

    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "B" },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(mocks.getPredictions).toHaveBeenCalledTimes(1)
    expect(mocks.getPredictions).toHaveBeenCalledWith("")
    expect(mocks.getPredictions).not.toHaveBeenCalledWith("B")
  })

  it("sends only the latest agent query after rapid typing stops", async () => {
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    const input = screen.getByRole("textbox", { name: "Search" })

    fireEvent.change(input, { target: { value: "na" } })
    fireEvent.change(input, { target: { value: "nan" } })
    fireEvent.change(input, { target: { value: "nang" } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS - 1)
    })
    expect(mocks.searchAgentProfiles).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)
    expect(mocks.searchAgentProfiles).toHaveBeenCalledWith({
      query: "nang",
      limit: 10,
      signal: expect.any(AbortSignal),
    })
  })

  it("does not search agents when the trimmed query is too short", async () => {
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    const input = screen.getByRole("textbox", { name: "Search" })

    fireEvent.change(input, { target: { value: "n" } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    fireEvent.change(input, { target: { value: "   " } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(mocks.searchAgentProfiles).not.toHaveBeenCalled()
  })

  it("cancels the pending search when the search mode changes", async () => {
    render(<PlaceSearch />)

    const input = screen.getByRole("textbox", { name: "Search" })
    fireEvent.change(input, { target: { value: "Bangkok" } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS - 1)
    })
    fireEvent.click(screen.getByRole("button", { name: "Agents" }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(mocks.getPredictions).not.toHaveBeenCalled()
    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)
    expect(mocks.searchAgentProfiles).toHaveBeenCalledWith({
      query: "Bangkok",
      limit: 10,
      signal: expect.any(AbortSignal),
    })
  })

  it("aborts an active agent request before starting the newer query", async () => {
    mocks.searchAgentProfiles
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValueOnce([])
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    const input = screen.getByRole("textbox", { name: "Search" })
    fireEvent.change(input, { target: { value: "first" } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    const firstRequest = mocks.searchAgentProfiles.mock.calls[0]?.[0]
    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)
    expect(firstRequest.signal.aborted).toBe(false)

    fireEvent.change(input, { target: { value: "second" } })

    expect(firstRequest.signal.aborted).toBe(true)
    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(2)
    expect(mocks.searchAgentProfiles).toHaveBeenLastCalledWith({
      query: "second",
      limit: 10,
      signal: expect.any(AbortSignal),
    })
  })

  it("cancels a pending debounced request when the search UI closes", async () => {
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "pending" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Open mobile search" }),
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Close mobile search" }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(mocks.searchAgentProfiles).not.toHaveBeenCalled()
  })

  it("aborts an active agent request when the typeahead unmounts", async () => {
    mocks.searchAgentProfiles.mockImplementationOnce(
      () => new Promise(() => undefined),
    )
    const { unmount } = render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "active" },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    const activeRequest = mocks.searchAgentProfiles.mock.calls[0]?.[0]
    expect(activeRequest.signal.aborted).toBe(false)

    unmount()

    expect(activeRequest.signal.aborted).toBe(true)
  })

  it("starts loading only when the debounced agent request begins", async () => {
    mocks.searchAgentProfiles.mockImplementationOnce(
      () => new Promise(() => undefined),
    )
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "loading" },
    })

    expect(
      screen.getByRole("status", { name: "Agent search status" }),
    ).toHaveTextContent("Idle")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS - 1)
    })
    expect(
      screen.getByRole("status", { name: "Agent search status" }),
    ).toHaveTextContent("Idle")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(
      screen.getByRole("status", { name: "Agent search status" }),
    ).toHaveTextContent("Loading")
  })

  it("flushes the latest agent query immediately when search is submitted", async () => {
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "immediate" },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mocks.searchAgentProfiles).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Search" }))

    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)
    expect(mocks.searchAgentProfiles).toHaveBeenCalledWith({
      query: "immediate",
      limit: 10,
      signal: expect.any(AbortSignal),
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })
    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(1)
  })

  it("clears stale agent results and loading when a search fails", async () => {
    mocks.searchAgentProfiles
      .mockResolvedValueOnce([{ _id: "agent-1" }])
      .mockRejectedValueOnce(new Error("Network error"))
    render(<PlaceSearch />)

    fireEvent.click(screen.getByRole("button", { name: "Agents" }))
    const input = screen.getByRole("textbox", { name: "Search" })
    fireEvent.change(input, { target: { value: "first" } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })
    expect(
      screen.getByRole("status", { name: "Agent result count" }),
    ).toHaveTextContent("1")

    fireEvent.change(input, { target: { value: "failed" } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TYPEAHEAD_DEBOUNCE_MS)
    })

    expect(
      screen.getByRole("status", { name: "Agent result count" }),
    ).toHaveTextContent("0")
    expect(
      screen.getByRole("status", { name: "Agent search status" }),
    ).toHaveTextContent("Idle")
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agent search is unavailable. Try again.",
    )

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await act(async () => undefined)

    expect(mocks.searchAgentProfiles).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
