import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { getNextPageParam } from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  DEFAULT_OWNER_SAVED_SEARCH_STATUS,
  ownerSavedSearchesQueryKey,
  ownerSavedSearchesQueryOptions,
  useSearchOwnerSavedSearches,
} from "./useSearchOwnerSavedSearches"

const searchOwnerSavedSearches = vi.hoisted(() => vi.fn())

vi.mock("./searchOwnerSavedSearches", () => ({
  searchOwnerSavedSearches,
}))

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

function pendingSignals() {
  const signals: AbortSignal[] = []
  searchOwnerSavedSearches.mockImplementation(
    (input: { signal?: AbortSignal }) => {
      if (input.signal) signals.push(input.signal)
      return new Promise(() => undefined)
    },
  )
  return signals
}

describe("ownerSavedSearchesQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(
      ownerSavedSearchesQueryKey({
        status: "Closed",
        limit: 10,
      }),
    ).toEqual(
      queryKeys.savedSearches.ownerList({
        status: "Closed",
        limit: 10,
      }),
    )
  })

  it("defaults to Waiting and the shared listing page size", () => {
    const options = ownerSavedSearchesQueryOptions()

    expect(DEFAULT_OWNER_SAVED_SEARCH_STATUS).toBe("Waiting")
    expect(options.queryKey).toEqual(
      queryKeys.savedSearches.ownerList({
        status: "Waiting",
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
    expect(options.initialPageParam).toBe(1)
    expect(options.enabled).toBe(true)
    expect(options.getNextPageParam).toBe(getNextPageParam)
  })

  it("uses distinct cache entries per status and limit", () => {
    const waiting = ownerSavedSearchesQueryOptions({ status: "Waiting" })
    const closed = ownerSavedSearchesQueryOptions({ status: "Closed" })
    const largerPage = ownerSavedSearchesQueryOptions({
      status: "Waiting",
      limit: 40,
    })

    expect(waiting.queryKey).not.toEqual(closed.queryKey)
    expect(waiting.queryKey).not.toEqual(largerPage.queryKey)
  })

  it("treats omitted status the same as Waiting for cache identity", () => {
    expect(ownerSavedSearchesQueryOptions().queryKey).toEqual(
      ownerSavedSearchesQueryOptions({ status: "Waiting" }).queryKey,
    )
  })

  it("respects enabled=false", () => {
    expect(ownerSavedSearchesQueryOptions({ enabled: false }).enabled).toBe(
      false,
    )
  })

  it("forwards AbortSignal, pageParam, status, and limit to the fetcher", async () => {
    searchOwnerSavedSearches.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 3, limit: 10, total: 0 },
    })
    const options = ownerSavedSearchesQueryOptions({
      status: "Closed",
      limit: 10,
    })
    const controller = new AbortController()

    await options.queryFn!({
      pageParam: 3,
      signal: controller.signal,
      queryKey: options.queryKey,
      meta: undefined,
      direction: "forward",
      client: new QueryClient(),
    })

    expect(searchOwnerSavedSearches).toHaveBeenCalledWith({
      status: "Closed",
      page: 3,
      limit: 10,
      signal: controller.signal,
    })
  })

  it("defensively coerces invalid pageParam values to page 1", async () => {
    searchOwnerSavedSearches.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    })
    const options = ownerSavedSearchesQueryOptions()

    await options.queryFn!({
      pageParam: "nope",
      signal: new AbortController().signal,
      queryKey: options.queryKey,
      meta: undefined,
      direction: "forward",
      client: new QueryClient(),
    })

    expect(searchOwnerSavedSearches).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    )
  })

  it("uses shared getNextPageParam for has-next / end-of-list", () => {
    const options = ownerSavedSearchesQueryOptions({ limit: 20 })

    expect(
      options.getNextPageParam?.(
        {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 45 },
        },
        [],
        1,
        [],
      ),
    ).toBe(2)

    expect(
      options.getNextPageParam?.(
        {
          success: true,
          data: [],
          pagination: { page: 3, limit: 20, total: 45 },
        },
        [],
        3,
        [],
      ),
    ).toBeUndefined()
  })
})

describe("useSearchOwnerSavedSearches", () => {
  it("aborts the previous request when status changes", async () => {
    const signals = pendingSignals()
    const { rerender, unmount } = renderHook(
      ({ status }: { status: "Waiting" | "Closed" }) =>
        useSearchOwnerSavedSearches({ status }),
      {
        initialProps: { status: "Waiting" as const },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ status: "Closed" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    unmount()
    expect(signals[1]?.aborted).toBe(true)
  })

  it("aborts the previous request when limit changes", async () => {
    const signals = pendingSignals()
    const { rerender, unmount } = renderHook(
      ({ limit }: { limit: number }) => useSearchOwnerSavedSearches({ limit }),
      {
        initialProps: { limit: 20 },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ limit: 40 })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    unmount()
  })

  it("does not fetch when disabled", async () => {
    searchOwnerSavedSearches.mockClear()
    const { result } = renderHook(
      () => useSearchOwnerSavedSearches({ enabled: false }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(searchOwnerSavedSearches).not.toHaveBeenCalled()
  })

  it("loads the first page through the infinite query", async () => {
    searchOwnerSavedSearches.mockResolvedValueOnce({
      success: true,
      data: [
        {
          _id: "req-1",
          createdBy: "user-1",
          name: "Request",
          description: null,
          status: "Waiting",
          geoSearch: { mode: "area" },
          filters: {},
          isDeleted: false,
          deletedAt: null,
          createdAt: "2026-08-03T18:00:00.000Z",
          updatedAt: "2026-08-03T18:00:00.000Z",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    })

    const { result } = renderHook(() => useSearchOwnerSavedSearches(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.data[0]?._id).toBe("req-1")
    expect(result.current.hasNextPage).toBe(false)
    expect(searchOwnerSavedSearches).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "Waiting",
        page: 1,
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
  })
})
