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
  updateOwnerSavedSearch: vi.fn(),
}))

vi.mock("./updateOwnerSavedSearch", () => ({
  updateOwnerSavedSearch: mocks.updateOwnerSavedSearch,
}))

import { useUpdateOwnerSavedSearch } from "./useUpdateOwnerSavedSearch"

type ListData = StatusInfiniteData<
  SavedSearch,
  SearchOwnerSavedSearchesResponse
>

const areaGeo = {
  mode: "area" as const,
  bounds: {
    northEast: { lat: 13.78, lng: 100.66 },
    southWest: { lat: 13.75, lng: 100.62 },
  },
}

const savedSearch = (
  id: string,
  overrides: Partial<SavedSearch> = {},
): SavedSearch =>
  ({
    _id: id,
    createdBy: "user-1",
    name: `Request ${id}`,
    description: null,
    status: "Waiting",
    geoSearch: { mode: "area" },
    filters: { minRent: 10000 },
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
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
  seedMultiLimit?: boolean
}) {
  const {
    seedDetail = true,
    seedWaiting = true,
    seedClosed = true,
    seedMultiLimit = true,
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
  const source = savedSearch("request-1")

  if (seedWaiting) {
    queryClient.setQueryData(
      waitingKey,
      listData(source, savedSearch("request-2")),
    )
  }
  if (seedMultiLimit) {
    queryClient.setQueryData(waitingLimit40Key, listData(source))
  }
  if (seedClosed) {
    queryClient.setQueryData(
      closedKey,
      listData(savedSearch("old-closed", { status: "Closed" })),
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
    ...renderHook(() => useUpdateOwnerSavedSearch(), { wrapper: Wrapper }),
    closedKey,
    detailKey,
    queryClient,
    source,
    waitingKey,
    waitingLimit40Key,
  }
}

const items = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryData<ListData>(key)?.pages.flatMap(page => page.data)

const ids = (queryClient: QueryClient, key: readonly unknown[]) =>
  items(queryClient, key)?.map(item => item._id)

const total = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryData<ListData>(key)?.pages[0]?.pagination.total

describe("useUpdateOwnerSavedSearch", () => {
  beforeEach(() => {
    mocks.updateOwnerSavedSearch.mockReset()
  })

  it("cancels in-flight queries and optimistically patches all Waiting lists + detail", async () => {
    let resolve!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearch.mockReturnValue(
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
        name: "  Renamed  ",
        description: "  New notes  ",
        geoSearch: areaGeo,
        filters: { maxRent: 40000 },
      }),
    )

    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[0]).toMatchObject({
        _id: "request-1",
        name: "Renamed",
        description: "New notes",
        geoSearch: areaGeo,
        filters: { maxRent: 40000 },
        status: "Waiting",
      }),
    )
    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(total(queryClient, waitingKey)).toBe(2)
    expect(items(queryClient, waitingLimit40Key)?.[0]).toMatchObject({
      name: "Renamed",
      status: "Waiting",
    })
    expect(total(queryClient, waitingLimit40Key)).toBe(1)
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(items(queryClient, closedKey)?.[0]?.name).toBe(
      "Request old-closed",
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Renamed",
      description: "New notes",
      geoSearch: areaGeo,
      status: "Waiting",
    })
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.savedSearches.ownerLists,
    })
    expect(cancel).toHaveBeenCalledWith({ queryKey: detailKey })

    await act(async () =>
      resolve(
        savedSearch("request-1", {
          name: "Server name",
          description: "Server notes",
          geoSearch: areaGeo,
          filters: { maxRent: 40000 },
        }),
      ),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("patches an item on a later infinite page without changing totals", async () => {
    mocks.updateOwnerSavedSearch.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, detailKey } = setup({
      seedMultiLimit: false,
      seedClosed: false,
    })

    queryClient.setQueryData(waitingKey, {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [savedSearch("request-2")],
          pagination: { page: 1, limit: 1, total: 3 },
        },
        {
          success: true,
          data: [savedSearch("request-1"), savedSearch("request-3")],
          pagination: { page: 2, limit: 1, total: 3 },
        },
      ],
    } satisfies ListData)

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Page 2 rename",
      }),
    )

    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[1]).toMatchObject({
        _id: "request-1",
        name: "Page 2 rename",
      }),
    )
    expect(ids(queryClient, waitingKey)).toEqual([
      "request-2",
      "request-1",
      "request-3",
    ])
    expect(total(queryClient, waitingKey)).toBe(3)
    expect(
      queryClient.getQueryData<ListData>(waitingKey)?.pages[1]?.pagination
        .total,
    ).toBe(3)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Page 2 rename",
    })
  })

  it("optimistically patches detail when the item is only in detail cache", async () => {
    mocks.updateOwnerSavedSearch.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, detailKey, waitingKey } = setup({
      seedWaiting: false,
      seedClosed: false,
      seedMultiLimit: false,
    })

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Detail only",
        description: null,
      }),
    )

    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        name: "Detail only",
        description: null,
        status: "Waiting",
      }),
    )
    expect(queryClient.getQueryData(waitingKey)).toBeUndefined()
  })

  it("optimistically patches Waiting and seeds detail when detail cache is missing", async () => {
    mocks.updateOwnerSavedSearch.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, detailKey } = setup({
      seedDetail: false,
      seedMultiLimit: false,
    })

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "From list",
      }),
    )

    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[0]).toMatchObject({
        name: "From list",
      }),
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      name: "From list",
      status: "Waiting",
    })
  })

  it("clears description optimistically with blank/null values", async () => {
    mocks.updateOwnerSavedSearch.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, detailKey, waitingKey } = setup({
      seedMultiLimit: false,
      seedClosed: false,
    })
    queryClient.setQueryData(
      detailKey,
      savedSearch("request-1", { description: "Old notes" }),
    )
    queryClient.setQueryData(
      waitingKey,
      listData(savedSearch("request-1", { description: "Old notes" })),
    )

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        description: "   ",
      }),
    )

    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        description: null,
      }),
    )
    expect(items(queryClient, waitingKey)?.[0]).toMatchObject({
      description: null,
    })
  })

  it("is a no-op on existing caches when the request is not loaded, then reconciles detail", async () => {
    mocks.updateOwnerSavedSearch.mockResolvedValue(
      savedSearch("missing", { name: "Server missing" }),
    )
    const { result, queryClient, waitingKey, closedKey, detailKey } = setup()

    act(() =>
      result.current.mutate({
        savedSearchId: "missing",
        name: "Draft missing",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(items(queryClient, waitingKey)?.[0]?.name).toBe("Request request-1")
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Request request-1",
      status: "Waiting",
    })
    expect(
      queryClient.getQueryData(
        queryKeys.savedSearches.ownerDetail("missing"),
      ),
    ).toMatchObject({
      _id: "missing",
      name: "Server missing",
    })
  })

  it("restores all Waiting lists and detail after failure", async () => {
    mocks.updateOwnerSavedSearch.mockRejectedValue(new Error("Network error"))
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
        name: "Renamed",
        filters: { maxRent: 1 },
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(items(queryClient, waitingKey)?.[0]).toMatchObject({
      name: "Request request-1",
      filters: { minRent: 10000 },
    })
    expect(total(queryClient, waitingKey)).toBe(2)
    expect(items(queryClient, waitingLimit40Key)?.[0]).toMatchObject({
      name: "Request request-1",
    })
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Request request-1",
      status: "Waiting",
    })
  })

  it.each([
    [404, "SAVED_SEARCH_NOT_FOUND"],
    [409, "SAVED_SEARCH_CLOSED"],
    [422, "NO_VALID_CHANGE"],
    [422, "VALIDATION_ERROR"],
    [403, "ACCOUNT_SUSPENDED"],
  ] as const)("rolls back after API %s %s", async (status, code) => {
    mocks.updateOwnerSavedSearch.mockRejectedValue(
      new ApiError(code, status, code),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Renamed",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ status, code })
    expect(items(queryClient, waitingKey)?.[0]?.name).toBe("Request request-1")
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Request request-1",
      status: "Waiting",
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("rolls back a Closed detail optimistic patch after SAVED_SEARCH_CLOSED", async () => {
    mocks.updateOwnerSavedSearch.mockRejectedValue(
      new ApiError(
        "This saved search is already closed.",
        409,
        "SAVED_SEARCH_CLOSED",
      ),
    )
    const { result, queryClient, detailKey, closedKey } = setup({
      seedWaiting: false,
      seedMultiLimit: false,
    })
    const closed = savedSearch("request-1", {
      status: "Closed",
      name: "Already closed",
    })
    queryClient.setQueryData(detailKey, closed)
    queryClient.setQueryData(closedKey, listData(closed))

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Should not stick",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Already closed",
      status: "Closed",
    })
    expect(items(queryClient, closedKey)?.[0]).toMatchObject({
      name: "Already closed",
      status: "Closed",
    })
  })

  it("reconciles server data and invalidates on success only", async () => {
    mocks.updateOwnerSavedSearch.mockResolvedValue(
      savedSearch("request-1", {
        name: "Canonical",
        description: null,
        updatedAt: "2026-08-04T02:00:00.000Z",
      }),
    )
    const { result, queryClient, waitingKey, waitingLimit40Key, detailKey } =
      setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "  request-1  ",
        name: "Draft",
        description: "   ",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(items(queryClient, waitingKey)?.[0]).toMatchObject({
      name: "Canonical",
      description: null,
      updatedAt: "2026-08-04T02:00:00.000Z",
    })
    expect(items(queryClient, waitingLimit40Key)?.[0]).toMatchObject({
      name: "Canonical",
    })
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Canonical",
      description: null,
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
    mocks.updateOwnerSavedSearch.mockRejectedValue(new Error("Network error"))
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Renamed",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("serializes repeated updates through the write scope", async () => {
    let resolveFirst!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearch.mockImplementation(
      ({ savedSearchId }: { savedSearchId: string }) =>
        savedSearchId.trim() === "request-1"
          ? new Promise<SavedSearch>(resolve => {
              resolveFirst = resolve
            })
          : Promise.resolve(
              savedSearch(savedSearchId.trim(), { name: "Second done" }),
            ),
    )
    const { result, queryClient } = setup()
    queryClient.setQueryData(
      queryKeys.savedSearches.ownerDetail("request-2"),
      savedSearch("request-2"),
    )

    act(() => {
      result.current.mutate({
        savedSearchId: "request-1",
        name: "First",
      })
      result.current.mutate({
        savedSearchId: "request-2",
        name: "Second",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearch).toHaveBeenCalledTimes(1),
    )
    await act(async () =>
      resolveFirst(savedSearch("request-1", { name: "First done" })),
    )
    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearch).toHaveBeenCalledTimes(2),
    )
  })

  it("does not let a failed older mutation roll back a newer optimistic update", async () => {
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (value: SavedSearch) => void
    let call = 0

    mocks.updateOwnerSavedSearch.mockImplementation(() => {
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

    const { result, queryClient, waitingKey, detailKey } = setup({
      seedMultiLimit: false,
      seedClosed: false,
    })

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "First draft",
      }),
    )
    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[0]?.name).toBe("First draft"),
    )

    act(() =>
      result.current.mutate({
        savedSearchId: "request-1",
        name: "Second draft",
      }),
    )
    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[0]?.name).toBe("Second draft"),
    )

    await act(async () => {
      rejectFirst(new Error("stale failure"))
    })
    await waitFor(() =>
      expect(items(queryClient, waitingKey)?.[0]?.name).toBe("Second draft"),
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Second draft",
    })

    await act(async () => {
      resolveSecond(
        savedSearch("request-1", {
          name: "Server second",
        }),
      )
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        name: "Server second",
      }),
    )
  })

  it("uses the shared owner saved-search write scope", () => {
    expect(OWNER_SAVED_SEARCH_WRITE_SCOPE_ID).toBe(
      "owner-saved-search-write",
    )
  })
})
