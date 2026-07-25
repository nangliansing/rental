import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const searchMocks = vi.hoisted(() => ({
  area: vi.fn(),
  nearLines: vi.fn(),
  nearby: vi.fn(),
}))

vi.mock("./searchBuildingsInMap", () => ({
  searchBuildingsInMap: searchMocks.area,
}))
vi.mock("./searchBuildingsNearby", () => ({
  searchBuildingsNearby: searchMocks.nearby,
}))
vi.mock("./searchBuildingsNearLines", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./searchBuildingsNearLines")>()
  return {
    ...actual,
    searchBuildingsNearLines: searchMocks.nearLines,
  }
})

import { useSearchBuildingsInMap } from "./useSearchBuildingsInMap"
import { useSearchBuildingsNearby } from "./useSearchBuildingsNearby"
import { useSearchBuildingsNearLines } from "./useSearchBuildingsNearLines"

const bounds = {
  northEast: { lat: 14, lng: 101 },
  southWest: { lat: 13, lng: 100 },
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function pendingSignals(mock: ReturnType<typeof vi.fn>) {
  const signals: AbortSignal[] = []
  mock.mockImplementation((input: { signal?: AbortSignal }) => {
    if (input.signal) signals.push(input.signal)
    return new Promise(() => undefined)
  })
  return signals
}

describe("map building-search cancellation", () => {
  it("aborts an area request when newer bounds are submitted", async () => {
    const signals = pendingSignals(searchMocks.area)
    const { rerender, unmount } = renderHook(
      ({ north }: { north: number }) =>
        useSearchBuildingsInMap({
          bounds: { ...bounds, northEast: { ...bounds.northEast, lat: north } },
          filters: {},
          enabled: true,
        }),
      { initialProps: { north: 14 }, wrapper: createWrapper() },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ north: 15 })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })

  it("aborts a nearby request when a newer position is submitted", async () => {
    const signals = pendingSignals(searchMocks.nearby)
    const { rerender, unmount } = renderHook(
      ({ lat }: { lat: number }) =>
        useSearchBuildingsNearby({
          position: { lat, lng: 100.6 },
          radiusMeters: 1000,
          filters: {},
          enabled: true,
        }),
      { initialProps: { lat: 13.7 }, wrapper: createWrapper() },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ lat: 13.8 })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })

  it("aborts a near-lines request when newer geometry is submitted", async () => {
    const signals = pendingSignals(searchMocks.nearLines)
    const { rerender, unmount } = renderHook(
      ({ endLongitude }: { endLongitude: number }) =>
        useSearchBuildingsNearLines({
          geometry: {
            type: "LineString",
            coordinates: [
              [100.6, 13.7],
              [endLongitude, 13.8],
            ],
          },
          distanceMeters: 500,
          filters: {},
          enabled: true,
        }),
      { initialProps: { endLongitude: 100.7 }, wrapper: createWrapper() },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ endLongitude: 100.8 })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })

  it("aborts a near-lines request when the distance changes", async () => {
    const signals = pendingSignals(searchMocks.nearLines)
    const { rerender, unmount } = renderHook(
      ({ distanceMeters }: { distanceMeters: number }) =>
        useSearchBuildingsNearLines({
          geometry: {
            type: "LineString",
            coordinates: [
              [100.6, 13.7],
              [100.7, 13.8],
            ],
          },
          distanceMeters,
          filters: {},
          enabled: true,
        }),
      { initialProps: { distanceMeters: 500 }, wrapper: createWrapper() },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ distanceMeters: 750 })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })
})
