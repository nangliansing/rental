import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  ownerSavedSearchQueryKey,
  ownerSavedSearchQueryOptions,
  useOwnerSavedSearchById,
} from "./useOwnerSavedSearchById"

const getOwnerSavedSearchById = vi.hoisted(() => vi.fn())

vi.mock("./getOwnerSavedSearchById", () => ({
  getOwnerSavedSearchById,
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
  getOwnerSavedSearchById.mockImplementation(
    (_id: string, signal?: AbortSignal) => {
      if (signal) signals.push(signal)
      return new Promise(() => undefined)
    },
  )
  return signals
}

const sampleSavedSearch = {
  _id: "request-1",
  createdBy: "user-1",
  name: "Sukhumvit 2BR",
  description: null,
  status: "Waiting" as const,
  geoSearch: { mode: "area" as const },
  filters: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

describe("ownerSavedSearchQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(ownerSavedSearchQueryKey("request-1")).toEqual(
      queryKeys.savedSearches.ownerDetail("request-1"),
    )
    expect(ownerSavedSearchQueryKey(undefined)).toEqual(
      queryKeys.savedSearches.ownerDetail(undefined),
    )
  })

  it("keeps detail keys outside the list family", () => {
    const detailKey = ownerSavedSearchQueryKey("request-1")
    const listKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })

    expect(detailKey).toEqual(["owner-saved-search", "request-1"])
    expect(detailKey[0]).not.toBe(listKey[0])
    expect(queryKeys.savedSearches.ownerDetails).toEqual([
      "owner-saved-search",
    ])
    expect(detailKey.slice(0, 1)).toEqual(queryKeys.savedSearches.ownerDetails)
  })

  it("defaults to enabled for a usable id", () => {
    const options = ownerSavedSearchQueryOptions("request-1")

    expect(options.enabled).toBe(true)
    expect(typeof options.queryFn).toBe("function")
  })

  it("forwards AbortSignal and id to the fetcher", async () => {
    getOwnerSavedSearchById.mockResolvedValueOnce(sampleSavedSearch)
    const options = ownerSavedSearchQueryOptions("request-1")
    const controller = new AbortController()

    await options.queryFn!({
      signal: controller.signal,
      queryKey: options.queryKey,
      meta: undefined,
      client: new QueryClient(),
    })

    expect(getOwnerSavedSearchById).toHaveBeenCalledWith(
      "request-1",
      controller.signal,
    )
  })

  it("passes an empty string through to the fetcher when id is missing", async () => {
    getOwnerSavedSearchById.mockRejectedValueOnce(
      new ApiError("Saved search id is required.", 422, "VALIDATION_ERROR"),
    )
    const options = ownerSavedSearchQueryOptions(undefined)

    await expect(
      options.queryFn!({
        signal: new AbortController().signal,
        queryKey: options.queryKey,
        meta: undefined,
        client: new QueryClient(),
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(getOwnerSavedSearchById).toHaveBeenCalledWith(
      "",
      expect.any(AbortSignal),
    )
  })

  it.each([undefined, "", "   ", "\n"])(
    "stays disabled without a usable id (%j)",
    savedSearchId => {
      expect(ownerSavedSearchQueryOptions(savedSearchId).enabled).toBe(
        false,
      )
    },
  )

  it("respects enabled=false even with a valid id", () => {
    expect(ownerSavedSearchQueryOptions("request-1", false).enabled).toBe(
      false,
    )
  })

  it("uses distinct cache entries per id", () => {
    expect(ownerSavedSearchQueryOptions("request-1").queryKey).not.toEqual(
      ownerSavedSearchQueryOptions("request-2").queryKey,
    )
  })
})

describe("useOwnerSavedSearchById", () => {
  it("aborts the previous request when the id changes", async () => {
    const signals = pendingSignals()
    const { rerender, unmount } = renderHook(
      ({ savedSearchId }: { savedSearchId: string }) =>
        useOwnerSavedSearchById({ savedSearchId }),
      {
        initialProps: { savedSearchId: "request-1" },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ savedSearchId: "request-2" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    unmount()
    expect(signals[1]?.aborted).toBe(true)
  })

  it("aborts when the id is cleared", async () => {
    const signals = pendingSignals()
    const { rerender } = renderHook(
      ({ savedSearchId }: { savedSearchId?: string }) =>
        useOwnerSavedSearchById({ savedSearchId }),
      {
        initialProps: { savedSearchId: "request-1" as string | undefined },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ savedSearchId: undefined })
    await waitFor(() => expect(signals[0]?.aborted).toBe(true))
  })

  it("does not fetch when disabled or id is missing", async () => {
    getOwnerSavedSearchById.mockClear()
    const { result, rerender } = renderHook(
      ({
        savedSearchId,
        enabled,
      }: {
        savedSearchId?: string
        enabled?: boolean
      }) => useOwnerSavedSearchById({ savedSearchId, enabled }),
      {
        initialProps: { savedSearchId: undefined as string | undefined },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerSavedSearchById).not.toHaveBeenCalled()

    rerender({ savedSearchId: "request-1", enabled: false })
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerSavedSearchById).not.toHaveBeenCalled()

    rerender({ savedSearchId: "   ", enabled: true })
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerSavedSearchById).not.toHaveBeenCalled()
  })

  it("starts fetching when enabled flips to true with a valid id", async () => {
    getOwnerSavedSearchById.mockResolvedValue(sampleSavedSearch)
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useOwnerSavedSearchById({
          savedSearchId: "request-1",
          enabled,
        }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerSavedSearchById).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getOwnerSavedSearchById).toHaveBeenCalledTimes(1)
  })

  it("loads a single saved search", async () => {
    getOwnerSavedSearchById.mockResolvedValueOnce(sampleSavedSearch)

    const { result } = renderHook(
      () => useOwnerSavedSearchById({ savedSearchId: "request-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?._id).toBe("request-1")
    expect(getOwnerSavedSearchById).toHaveBeenCalledWith(
      "request-1",
      expect.any(AbortSignal),
    )
  })

  it("surfaces not-found errors from the fetcher", async () => {
    getOwnerSavedSearchById.mockRejectedValueOnce(
      new ApiError(
        "This saved search could not be found.",
        404,
        "SAVED_SEARCH_NOT_FOUND",
      ),
    )

    const { result } = renderHook(
      () => useOwnerSavedSearchById({ savedSearchId: "missing" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 404,
      code: "SAVED_SEARCH_NOT_FOUND",
    })
  })

  it("surfaces auth failures from the fetcher", async () => {
    getOwnerSavedSearchById.mockRejectedValueOnce(
      new ApiError("Please log in to continue.", 401, "ACCESS_TOKEN_REQUIRED"),
    )

    const { result } = renderHook(
      () => useOwnerSavedSearchById({ savedSearchId: "request-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 401,
      code: "ACCESS_TOKEN_REQUIRED",
    })
  })
})
