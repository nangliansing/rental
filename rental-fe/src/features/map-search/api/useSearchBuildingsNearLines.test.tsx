import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const searchBuildingsNearLines = vi.hoisted(() => vi.fn())

vi.mock("./searchBuildingsNearLines", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./searchBuildingsNearLines")>()
  return { ...actual, searchBuildingsNearLines }
})

import { useSearchBuildingsNearLines } from "./useSearchBuildingsNearLines"

const geometry = {
  type: "LineString" as const,
  coordinates: [
    [100.6, 13.7] as [number, number],
    [100.7, 13.8] as [number, number],
  ],
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

describe("useSearchBuildingsNearLines", () => {
  beforeEach(() => searchBuildingsNearLines.mockReset())

  it("does not send a request when disabled or geometry is absent", async () => {
    const { rerender } = renderHook(
      ({ enabled, hasGeometry }: { enabled: boolean; hasGeometry: boolean }) =>
        useSearchBuildingsNearLines({
          geometry: hasGeometry ? geometry : null,
          filters: {},
          enabled,
        }),
      {
        initialProps: { enabled: false, hasGeometry: true },
        wrapper: createWrapper(),
      },
    )

    await act(async () => undefined)
    expect(searchBuildingsNearLines).not.toHaveBeenCalled()

    rerender({ enabled: true, hasGeometry: false })
    await act(async () => undefined)
    expect(searchBuildingsNearLines).not.toHaveBeenCalled()
  })

  it("uses defaults and requests every available page", async () => {
    searchBuildingsNearLines.mockImplementation(
      async (input?: { page?: number }) => {
        const page = input?.page ?? 1
        return {
          success: true,
          data: [{ _id: `building-${page}` }],
          pagination: { page, limit: 20, total: 21 },
        }
      },
    )

    const { result } = renderHook(
      () =>
        useSearchBuildingsNearLines({
          geometry,
          filters: { isPetAllowed: true },
          enabled: true,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(searchBuildingsNearLines).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        geometry,
        distanceMeters: 500,
        filters: { isPetAllowed: true },
        page: 1,
        limit: 20,
        signal: expect.any(AbortSignal),
      }),
    )
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    expect(searchBuildingsNearLines).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2 }),
    )
    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2)
      expect(result.current.hasNextPage).toBe(false)
    })
  })
})
