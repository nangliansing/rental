import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { SavedSearch } from "./savedSearchParsers"
import type { SearchOwnerSavedSearchesResponse } from "./savedSearchParsers"
import type { OwnerSavedSearchesInfiniteData } from "./savedSearchMutationCache"
import type { DeletedOwnerSavedSearch } from "./deleteOwnerSavedSearch"

const mocks = vi.hoisted(() => ({
  updateOwnerSavedSearch: vi.fn(),
  updateOwnerSavedSearchStatus: vi.fn(),
  deleteOwnerSavedSearch: vi.fn(),
}))

vi.mock("./updateOwnerSavedSearch", () => ({
  updateOwnerSavedSearch: mocks.updateOwnerSavedSearch,
}))

vi.mock("./updateOwnerSavedSearchStatus", () => ({
  updateOwnerSavedSearchStatus: mocks.updateOwnerSavedSearchStatus,
}))

vi.mock("./deleteOwnerSavedSearch", async importOriginal => {
  const actual =
    await importOriginal<typeof import("./deleteOwnerSavedSearch")>()
  return {
    ...actual,
    deleteOwnerSavedSearch: mocks.deleteOwnerSavedSearch,
  }
})

import { useDeleteOwnerSavedSearch } from "./useDeleteOwnerSavedSearch"
import { useUpdateOwnerSavedSearch } from "./useUpdateOwnerSavedSearch"
import { useUpdateOwnerSavedSearchStatus } from "./useUpdateOwnerSavedSearchStatus"

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
    filters: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
  }) as SavedSearch

const deleted = (id: string): DeletedOwnerSavedSearch =>
  ({
    ...savedSearch(id),
    isDeleted: true,
    deletedAt: "2026-08-04T02:00:00.000Z",
  }) as DeletedOwnerSavedSearch

const listData = (
  ...items: SavedSearch[]
): OwnerSavedSearchesInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    } satisfies SearchOwnerSavedSearchesResponse,
  ],
})

describe("owner saved-search write scope", () => {
  beforeEach(() => {
    mocks.updateOwnerSavedSearch.mockReset()
    mocks.updateOwnerSavedSearchStatus.mockReset()
    mocks.deleteOwnerSavedSearch.mockReset()
  })

  it("serializes content update with status close on the shared write scope", async () => {
    let resolveUpdate!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearch.mockImplementation(
      () =>
        new Promise<SavedSearch>(resolve => {
          resolveUpdate = resolve
        }),
    )
    mocks.updateOwnerSavedSearchStatus.mockResolvedValue(
      savedSearch("request-1", { status: "Closed", name: "Closed name" }),
    )

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = savedSearch("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        update: useUpdateOwnerSavedSearch(),
        close: useUpdateOwnerSavedSearchStatus(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.update.mutate({
        savedSearchId: "request-1",
        name: "Renamed first",
      })
      result.current.close.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearch).toHaveBeenCalledTimes(1),
    )
    expect(mocks.updateOwnerSavedSearchStatus).not.toHaveBeenCalled()

    await act(async () =>
      resolveUpdate(savedSearch("request-1", { name: "Renamed first" })),
    )
    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearchStatus).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.close.isSuccess).toBe(true))
  })

  it("serializes delete behind content update on the shared write scope", async () => {
    let resolveUpdate!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearch.mockImplementation(
      () =>
        new Promise<SavedSearch>(resolve => {
          resolveUpdate = resolve
        }),
    )
    mocks.deleteOwnerSavedSearch.mockResolvedValue(deleted("request-1"))

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = savedSearch("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        update: useUpdateOwnerSavedSearch(),
        remove: useDeleteOwnerSavedSearch(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.update.mutate({
        savedSearchId: "request-1",
        name: "Renamed first",
      })
      result.current.remove.mutate({
        savedSearchId: "request-1",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearch).toHaveBeenCalledTimes(1),
    )
    expect(mocks.deleteOwnerSavedSearch).not.toHaveBeenCalled()

    await act(async () =>
      resolveUpdate(savedSearch("request-1", { name: "Renamed first" })),
    )
    await waitFor(() =>
      expect(mocks.deleteOwnerSavedSearch).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true))
  })

  it("serializes delete behind status close on the shared write scope", async () => {
    let resolveClose!: (value: SavedSearch) => void
    mocks.updateOwnerSavedSearchStatus.mockImplementation(
      () =>
        new Promise<SavedSearch>(resolve => {
          resolveClose = resolve
        }),
    )
    mocks.deleteOwnerSavedSearch.mockResolvedValue(deleted("request-1"))

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = savedSearch("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        close: useUpdateOwnerSavedSearchStatus(),
        remove: useDeleteOwnerSavedSearch(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.close.mutate({
        savedSearchId: "request-1",
        status: "Closed",
      })
      result.current.remove.mutate({
        savedSearchId: "request-1",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerSavedSearchStatus).toHaveBeenCalledTimes(1),
    )
    expect(mocks.deleteOwnerSavedSearch).not.toHaveBeenCalled()

    await act(async () =>
      resolveClose(savedSearch("request-1", { status: "Closed" })),
    )
    await waitFor(() =>
      expect(mocks.deleteOwnerSavedSearch).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true))
  })
})
