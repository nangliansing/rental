import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mapState = vi.hoisted(() => ({
  current: null as null | {
    fitBounds: ReturnType<typeof vi.fn>
    panTo: ReturnType<typeof vi.fn>
    setZoom: ReturnType<typeof vi.fn>
  },
}))

vi.mock("@vis.gl/react-google-maps", () => ({
  useMap: () => mapState.current,
}))

import { usePlaceSearch } from "./usePlaceSearch"

type SuggestionResponse = {
  suggestions: Array<{
    placePrediction: {
      placeId: string
      text: { toString: () => string }
    }
  }>
}

function suggestion(id: string, text: string): SuggestionResponse {
  return {
    suggestions: [
      {
        placePrediction: {
          placeId: id,
          text: { toString: () => text },
        },
      },
    ],
  }
}

describe("usePlaceSearch", () => {
  const fetchAutocompleteSuggestions = vi.fn()
  const createSessionToken = vi.fn(function AutocompleteSessionToken() {})

  beforeEach(() => {
    fetchAutocompleteSuggestions.mockReset()
    createSessionToken.mockClear()
    mapState.current = null
    vi.stubGlobal("google", {
      maps: {
        importLibrary: vi.fn().mockResolvedValue({
          AutocompleteSessionToken: createSessionToken,
          AutocompleteSuggestion: { fetchAutocompleteSuggestions },
        }),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("clears locally without calling Google for an empty query", async () => {
    const { result } = renderHook(() => usePlaceSearch())

    await act(async () => {
      await result.current.getPredictions("   ")
    })

    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled()
    expect(result.current.predictions).toEqual([])
  })

  it("ignores an older Google response that resolves after a newer query", async () => {
    let resolveFirst!: (value: SuggestionResponse) => void
    let resolveSecond!: (value: SuggestionResponse) => void
    fetchAutocompleteSuggestions
      .mockImplementationOnce(
        () => new Promise<SuggestionResponse>((resolve) => {
          resolveFirst = resolve
        }),
      )
      .mockImplementationOnce(
        () => new Promise<SuggestionResponse>((resolve) => {
          resolveSecond = resolve
        }),
      )
    const { result } = renderHook(() => usePlaceSearch())

    let firstRequest!: Promise<void>
    let secondRequest!: Promise<void>
    act(() => {
      firstRequest = result.current.getPredictions("Bang")
      secondRequest = result.current.getPredictions("Bangkok")
    })
    await waitFor(() =>
      expect(fetchAutocompleteSuggestions).toHaveBeenCalledTimes(2),
    )

    await act(async () => {
      resolveSecond(suggestion("new", "Bangkok"))
      await secondRequest
    })
    expect(result.current.predictions).toMatchObject([
      { id: "new", text: "Bangkok" },
    ])

    await act(async () => {
      resolveFirst(suggestion("old", "Bang"))
      await firstRequest
    })
    expect(result.current.predictions).toMatchObject([
      { id: "new", text: "Bangkok" },
    ])
  })

  it("reuses the session token while typing and renews it after selection", async () => {
    const firstPrediction = {
      placeId: "bangkok",
      text: { toString: () => "Bangkok" },
      toPlace: () => ({
        displayName: "Bangkok",
        fetchFields: vi.fn().mockResolvedValue(undefined),
        location: { lat: () => 13.7563, lng: () => 100.5018 },
        viewport: null,
      }),
    }
    fetchAutocompleteSuggestions
      .mockResolvedValueOnce({
        suggestions: [{ placePrediction: firstPrediction }],
      })
      .mockResolvedValueOnce(suggestion("bangkok-2", "Bangkok Noi"))
      .mockResolvedValueOnce(suggestion("chiang-mai", "Chiang Mai"))
    mapState.current = {
      fitBounds: vi.fn(),
      panTo: vi.fn(),
      setZoom: vi.fn(),
    }
    const { result } = renderHook(() => usePlaceSearch())

    await act(async () => {
      await result.current.getPredictions("Bang")
      await result.current.getPredictions("Bangkok")
    })

    const firstToken = fetchAutocompleteSuggestions.mock.calls[0]?.[0]
      .sessionToken
    const secondToken = fetchAutocompleteSuggestions.mock.calls[1]?.[0]
      .sessionToken
    expect(createSessionToken).toHaveBeenCalledTimes(1)
    expect(secondToken).toBe(firstToken)

    await act(async () => {
      await result.current.selectPrediction(
        firstPrediction as unknown as google.maps.places.PlacePrediction,
        vi.fn(),
      )
      await result.current.getPredictions("Chiang Mai")
    })

    const nextSessionToken = fetchAutocompleteSuggestions.mock.calls[2]?.[0]
      .sessionToken
    expect(createSessionToken).toHaveBeenCalledTimes(2)
    expect(nextSessionToken).not.toBe(firstToken)
  })

  it("clears stale Google predictions when the current request fails", async () => {
    fetchAutocompleteSuggestions
      .mockResolvedValueOnce(suggestion("bangkok", "Bangkok"))
      .mockRejectedValueOnce(new Error("Google unavailable"))
    const { result } = renderHook(() => usePlaceSearch())

    await act(async () => {
      await result.current.getPredictions("Bangkok")
    })
    expect(result.current.predictions).toHaveLength(1)

    await act(async () => {
      await result.current.getPredictions("Chiang Mai")
    })

    expect(result.current.predictions).toEqual([])
    expect(result.current.predictionError).toBe(
      "Place search is unavailable. Try again.",
    )

    act(() => result.current.clearPredictionError())
    expect(result.current.predictionError).toBeNull()
  })

  it("contains place-detail failures and exposes a recoverable error", async () => {
    mapState.current = {
      fitBounds: vi.fn(),
      panTo: vi.fn(),
      setZoom: vi.fn(),
    }
    const prediction = {
      text: { toString: () => "Bangkok" },
      toPlace: () => ({
        fetchFields: vi.fn().mockRejectedValue(new Error("Google unavailable")),
      }),
    } as unknown as google.maps.places.PlacePrediction
    const { result } = renderHook(() => usePlaceSearch())

    let didSelect = true
    await act(async () => {
      didSelect = await result.current.selectPrediction(prediction, vi.fn())
    })

    expect(didSelect).toBe(false)
    expect(result.current.predictionError).toBe(
      "This place could not be loaded. Try again.",
    )
  })
})
