import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const searchMocks = vi.hoisted(() => ({
  area: vi.fn(),
  nearby: vi.fn(),
  line: vi.fn(),
}))

vi.mock("./searchBuildingsInMap", () => ({
  searchBuildingsInMap: searchMocks.area,
}))
vi.mock("./searchBuildingsNearby", () => ({
  searchBuildingsNearby: searchMocks.nearby,
}))
vi.mock("./searchBuildingsNearLines", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./searchBuildingsNearLines")>()),
  searchBuildingsNearLines: searchMocks.line,
}))

import { useSearchBuildingsInMap } from "./useSearchBuildingsInMap"
import { useSearchBuildingsNearby } from "./useSearchBuildingsNearby"
import { useSearchBuildingsNearLines } from "./useSearchBuildingsNearLines"

type Mode = "area" | "pin" | "line"

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

function useModeQueries(mode: Mode) {
  useSearchBuildingsInMap({
    bounds: {
      northEast: { lat: 14, lng: 101 },
      southWest: { lat: 13, lng: 100 },
    },
    filters: {},
    enabled: mode === "area",
  })
  useSearchBuildingsNearby({
    position: { lat: 13.7, lng: 100.6 },
    radiusMeters: 1_000,
    filters: {},
    enabled: mode === "pin",
  })
  useSearchBuildingsNearLines({
    geometry: {
      type: "LineString",
      coordinates: [
        [100.6, 13.7],
        [100.7, 13.8],
      ],
    },
    distanceMeters: 500,
    filters: {},
    enabled: mode === "line",
  })
}

describe("map building-search activation contract", () => {
  beforeEach(() => {
    for (const search of Object.values(searchMocks)) {
      search.mockReset()
      search.mockImplementation(() => new Promise(() => undefined))
    }
  })

  it("starts only the query related to the active mode", async () => {
    const { rerender } = renderHook(({ mode }: { mode: Mode }) => useModeQueries(mode), {
      initialProps: { mode: "area" as Mode },
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(searchMocks.area).toHaveBeenCalledOnce())
    expect(searchMocks.nearby).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    rerender({ mode: "pin" })
    await waitFor(() => expect(searchMocks.nearby).toHaveBeenCalledOnce())
    expect(searchMocks.line).not.toHaveBeenCalled()

    rerender({ mode: "line" })
    await waitFor(() => expect(searchMocks.line).toHaveBeenCalledOnce())
  })
})
