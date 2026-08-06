import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { StatusInfiniteData } from "@/lib/status-transition-cache"

import type { SavedSearch } from "./savedSearchParsers"
import type { SearchOwnerSavedSearchesResponse } from "./savedSearchParsers"
import { OWNER_SAVED_SEARCH_WRITE_SCOPE_ID } from "./savedSearchMutationCache"

const mocks = vi.hoisted(() => ({
  updateOwnerSavedSearchStatus: vi.fn(),
}))

vi.mock("./updateOwnerSavedSearchStatus", () => ({
  updateOwnerSavedSearchStatus: mocks.updateOwnerSavedSearchStatus,
}))

import { useUpdateOwnerSavedSearchStatus } from "./useUpdateOwnerSavedSearchStatus"

type ListData = StatusInfiniteData<
  SavedSearch,
  SearchOwnerSavedSearchesResponse
>

const savedSearch = (
  id: string,
  status: SavedSearch["status"] = "Waiting",
): SavedSearch =>
  ({
    _id: id,
    createdBy: "user-1",
    name: `Request ${id}`,
    description: null,
    status,
    geoSearch: { mode: "area" },
    filters: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
  }) as SavedSearch

const listData = (...items: SavedSearch[]): ListData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    },
  ],
})

function setup(options?: {
  seedDetail?: boolean
  seedWaiting?: boolean
  seedClosed?: boolean
}) {
  const {
    seedDetail = true,
    seedWaiting = true,
    seedClosed = true,
  } = options ?? {}

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const waitingKey = queryKeys.savedSearches.ownerList({
    status: "Waiting",
    limit: 20,
  })
  const waitingLimit40Key = queryKeys.savedSearches.ownerList({
    status: "Waiting",
    limit: 40,
  })
  const closedKey = queryKeys.savedSearches.ownerList({
    status: "Closed",
    limit: 20,
  })
  const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
  const source = savedSearch("request-1", "Waiting")

  if (seedWaiting) {
    queryClient.setQueryData(
      waitingKey,
      listData(source, savedSearch("request-2", "Waiting")),
    )
    queryClient.setQueryData(waitingLimit40Key, listData(source))
  }
  if (seedClosed) {
    queryClient.setQueryData(
      closedKey,
      listData(savedSearch("old-closed", "Closed")),
    )
  }
  if (seedDetail) {
    queryClient.setQueryData(detailKey, source)
  }

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useUpdateOwnerSavedSearchStatus(), {
      wrapper: Wrapper,
    }),
    closedKey,
    detailKey,
    queryClient,
    source,
    waitingKey,
    waitingLimit40Key,
  }
}

const ids = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient
    .getQueryData<ListData>(key)
    ?.pages.flatMap(page => page.data)
    .map(item => item._id)

const total = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryData<ListData>(key)?.pages[0]?.pagination.total

describe("useUpdateOwnerSavedSearchStatus", () => {
  beforeEach(() => {
    mocks.updateOwnerSavedSearchStatus.mockReset()
  })

  it("cancels in-flight queries and optimistically closes Waiting + detail", async () => {
    let resolve!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearchStatus.mockReturnValue(
      new Promise<SavedSearch>(done => {
        resolve = done
      }),
    )

    const {
      result,
      queryClient,
      waitingKey,
      waitingLimit40Key,
      closedKey,
      detailKey,
    } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )

    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    expect(total(queryClient, waitingKey)).toBe(1)
    expect(ids(queryClient, waitingLimit40Key)).toEqual([])
    expect(total(queryClient, waitingLimit40Key)).toBe(0)
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(total(queryClient, closedKey)).toBe(1)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      status: "Closed",
    })
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.savedSearches.ownerLists,
    })
    expect(cancel).toHaveBeenCalledWith({ queryKey: detailKey })

    await act(async () => resolve(savedSearch("request-1", "Closed")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("optimistically patches detail when the item is only in detail cache", async () => {
    mocks.updateOwnerSavedSearchStatus.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, detailKey, waitingKey } = setup({
      seedWaiting: false,
      seedClosed: false,
    })

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )

    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "Closed",
      }),
    )
    expect(queryClient.getQueryData(waitingKey)).toBeUndefined()
  })

  it("optimistically removes from Waiting and seeds detail when detail cache is missing", async () => {
    mocks.updateOwnerSavedSearchStatus.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, detailKey } = setup({
      seedDetail: false,
    })

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )

    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    // Found in Waiting lists, so detail is seeded with the Closed projection.
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      status: "Closed",
    })
  })

  it("is a no-op on cache when the request is not loaded", async () => {
    mocks.updateOwnerSavedSearchStatus.mockResolvedValue(
      savedSearch("missing", "Closed"),
    )
    const { result, queryClient, waitingKey, closedKey, detailKey } = setup()
    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    act(() =>
      result.current.mutate({
        savedSearchId: "missing",
        status: "Closed",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Waiting",
    })
    // Transaction may still write detail for reconcile with server body.
    expect(setQueryData).toHaveBeenCalled()
    expect(queryClient.getQueryData(
      queryKeys.savedSearches.ownerDetail("missing"),
    )).toMatchObject({
      _id: "missing",
      status: "Closed",
    })
  })

  it("restores Waiting list and detail after failure", async () => {
    mocks.updateOwnerSavedSearchStatus.mockRejectedValue(
      new Error("Network error"),
    )
    const {
      result,
      queryClient,
      waitingKey,
      waitingLimit40Key,
      closedKey,
      detailKey,
    } = setup()

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(total(queryClient, waitingKey)).toBe(2)
    expect(ids(queryClient, waitingLimit40Key)).toEqual(["request-1"])
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Waiting",
    })
  })

  it.each([
    [404, "SAVED_SEARCH_NOT_FOUND"],
    [409, "SAVED_SEARCH_CLOSED"],
  ] as const)("rolls back after API %s %s", async (status, code) => {
    mocks.updateOwnerSavedSearchStatus.mockRejectedValue(
      new ApiError(code, status, code),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ status, code })
    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Waiting",
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("reconciles server data and invalidates lists + detail on success only", async () => {
    mocks.updateOwnerSavedSearchStatus.mockResolvedValue({
      ...savedSearch("request-1", "Closed"),
      updatedAt: "2026-08-04T02:00:00.000Z",
      name: "Canonical name",
    })
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "  request-1  ",
        status: "Closed",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Closed",
      name: "Canonical name",
      updatedAt: "2026-08-04T02:00:00.000Z",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.savedSearches.ownerLists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("does not invalidate after failure", async () => {
    mocks.updateOwnerSavedSearchStatus.mockRejectedValue(
      new Error("Network error"),
    )
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("serializes repeated status updates through the write scope", async () => {
    let resolveFirst!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearchStatus.mockImplementation(
      ({ savedSearchId }: { savedSearchId: string }) =>
        savedSearchId.trim() === "request-1"
          ? new Promise<SavedSearch>(resolve => {
              resolveFirst = resolve
            })
          : Promise.resolve(savedSearch(savedSearchId.trim(), "Closed")),
    )
    const { result, queryClient } = setup()
    queryClient.setQueryData(
      queryKeys.savedSearches.ownerDetail("request-2"),
      savedSearch("request-2", "Waiting"),
    )
    queryClient.setQueryData(
      queryKeys.savedSearches.ownerList({ status: "Waiting", limit: 20 }),
      listData(
        savedSearch("request-1", "Waiting"),
        savedSearch("request-2", "Waiting"),
      ),
    )

    act(() => {
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      })
      result.current.mutate({
        savedSearchId: "request-2",
        status: "Closed",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearchStatus).toHaveBeenCalledTimes(1),
    )
    await act(async () =>
      resolveFirst(savedSearch("request-1", "Closed")),
    )
    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearchStatus).toHaveBeenCalledTimes(2),
    )
  })

  it("does not let a failed older mutation roll back a newer optimistic close", async () => {
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (value: SavedSearch) => void
    let call = 0

    mocks.updateOwnerSavedSearchStatus.mockImplementation(() => {
      call += 1
      if (call === 1) {
        return new Promise<SavedSearch>((_resolve, reject) => {
          rejectFirst = reject
        })
      }
      return new Promise<SavedSearch>(resolve => {
        resolveSecond = resolve
      })
    })

    const { result, queryClient, waitingKey, detailKey } = setup()

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    // Re-seed Waiting so a second optimistic close has something to remove.
    queryClient.setQueryData(
      waitingKey,
      listData(
        savedSearch("request-1", "Waiting"),
        savedSearch("request-2", "Waiting"),
      ),
    )
    queryClient.setQueryData(detailKey, savedSearch("request-1", "Waiting"))

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      }),
    )
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    await act(async () => {
      rejectFirst(new Error("stale failure"))
    })
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Closed",
    })

    await act(async () => {
      resolveSecond({
        ...savedSearch("request-1", "Closed"),
        name: "Server closed",
      })
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        name: "Server closed",
      }),
    )
  })

  it("uses the shared owner saved-search write scope", () => {
    expect(OWNER_SAVED_SEARCH_WRITE_SCOPE_ID).toBe(
      "owner-saved-search-write",
    )
  })
})
