import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import { listingCollectionQueryKeys } from "../utils/listingMutationCache"

const mocks = vi.hoisted(() => ({
  deleteOwnerListing: vi.fn(),
}))

vi.mock("./deleteOwnerListing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deleteOwnerListing")>()
  return {
    ...actual,
    deleteOwnerListing: mocks.deleteOwnerListing,
  }
})

import { useDeleteOwnerListing } from "./useDeleteOwnerListing"

const listing = {
  _id: "listing-1",
  visibility: "PUBLIC",
  rent: 15_000,
}
const otherListing = {
  _id: "listing-2",
  visibility: "PUBLIC",
  rent: 20_000,
}
const deletedListing = {
  ...listing,
  visibility: "PRIVATE",
  isDeleted: true,
  deletedAt: "2026-07-30T00:00:00.000Z",
  deletedBy: "user-1",
  deleteReason: null,
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
  const publicDetailKey = queryKeys.listings.publicDetail(
    "listing-1",
    "viewer-1",
  )
  const ownerListKey = queryKeys.listings.ownerList({
    filter: "all",
    sort: "latest",
    limit: 20,
  })
  const savedListKey = queryKeys.savedListings.list({ limit: 20 })
  const unrelatedKey = queryKeys.notifications.me
  const ownerListData = {
    pageParams: [1],
    pages: [{
      data: [listing, otherListing],
      pagination: { page: 1, limit: 20, total: 2 },
    }],
  }
  const savedListData = {
    pageParams: [1],
    pages: [{
      data: {
        savedListings: [{
          _id: "saved-1",
          listingId: "listing-1",
          listing,
          snapshot: { rent: listing.rent },
        }],
      },
      pagination: { page: 1, limit: 20, total: 1 },
    }],
  }

  queryClient.setQueryData(ownerDetailKey, { listing })
  queryClient.setQueryData(publicDetailKey, listing)
  queryClient.setQueryData(ownerListKey, ownerListData)
  queryClient.setQueryData(savedListKey, savedListData)
  queryClient.setQueryData(unrelatedKey, { unreadCount: 2 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useDeleteOwnerListing(), { wrapper: Wrapper }),
    ownerDetailKey,
    ownerListData,
    ownerListKey,
    publicDetailKey,
    queryClient,
    savedListData,
    savedListKey,
    unrelatedKey,
  }
}

describe("useDeleteOwnerListing", () => {
  beforeEach(() => {
    mocks.deleteOwnerListing.mockReset()
  })

  it("optimistically removes collection copies and marks saved copies unavailable", async () => {
    let resolve!: (value: typeof deletedListing) => void
    mocks.deleteOwnerListing.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const {
      result,
      queryClient,
      ownerDetailKey,
      ownerListKey,
      publicDetailKey,
      savedListKey,
    } = setup()

    act(() => result.current.mutate("listing-1"))
    await waitFor(() =>
      expect(queryClient.getQueryData(ownerListKey)).toMatchObject({
        pages: [{
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        }],
      }),
    )
    expect(queryClient.getQueryData(savedListKey)).toMatchObject({
      pages: [{ data: { savedListings: [{ listing: null }] } }],
    })
    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      listing: { visibility: "PRIVATE" },
    })
    expect(queryClient.getQueryData(publicDetailKey)).toMatchObject({
      visibility: "PRIVATE",
    })

    await act(async () => resolve(deletedListing))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(publicDetailKey)).toBeUndefined()
  })

  it("restores complete cache snapshots and skips invalidation on failure", async () => {
    mocks.deleteOwnerListing.mockRejectedValue(new Error("Network error"))
    const {
      result,
      queryClient,
      ownerDetailKey,
      ownerListData,
      ownerListKey,
      publicDetailKey,
      savedListData,
      savedListKey,
      unrelatedKey,
    } = setup()
    const unrelated = queryClient.getQueryData(unrelatedKey)
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate("listing-1"))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(ownerDetailKey)).toEqual({ listing })
    expect(queryClient.getQueryData(publicDetailKey)).toEqual(listing)
    expect(queryClient.getQueryData(ownerListKey)).toEqual(ownerListData)
    expect(queryClient.getQueryData(savedListKey)).toEqual(savedListData)
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelated)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("treats an already-deleted listing as idempotent success", async () => {
    mocks.deleteOwnerListing.mockRejectedValue(
      new ApiError("Listing not found", 404, "LISTING_NOT_FOUND"),
    )
    const {
      result,
      queryClient,
      ownerDetailKey,
      publicDetailKey,
    } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate("listing-1"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(publicDetailKey)).toBeUndefined()
    expect(invalidate).toHaveBeenCalledTimes(5)
    for (const queryKey of listingCollectionQueryKeys) {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey,
        refetchType: "active",
      })
    }
  })

  it("removes detail variants recreated while the request is pending", async () => {
    let resolve!: (value: typeof deletedListing) => void
    mocks.deleteOwnerListing.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, ownerDetailKey } = setup()
    const secondPublicDetailKey = queryKeys.listings.publicDetail(
      "listing-1",
      "viewer-2",
    )

    act(() => result.current.mutate("listing-1"))
    await waitFor(() =>
      expect(mocks.deleteOwnerListing).toHaveBeenCalledTimes(1),
    )

    queryClient.setQueryData(ownerDetailKey, { listing })
    queryClient.setQueryData(secondPublicDetailKey, listing)
    await act(async () => resolve(deletedListing))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(secondPublicDetailKey)).toBeUndefined()
  })

  it("does not call the endpoint or mutate caches when cancellation fails", async () => {
    const { result, queryClient, ownerListData, ownerListKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate("listing-1"))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteOwnerListing).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(ownerListKey)).toEqual(ownerListData)
  })

  it("serializes repeated deletes that share collection pagination", async () => {
    let resolveFirst!: (value: typeof deletedListing) => void
    mocks.deleteOwnerListing
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveFirst = done
          }),
      )
      .mockResolvedValueOnce({
        ...deletedListing,
        _id: "listing-2",
      })
    const { result } = setup()

    act(() => {
      result.current.mutate("listing-1")
      result.current.mutate("listing-2")
    })
    await waitFor(() =>
      expect(mocks.deleteOwnerListing).toHaveBeenCalledTimes(1),
    )

    await act(async () => resolveFirst(deletedListing))
    await waitFor(() =>
      expect(mocks.deleteOwnerListing).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("succeeds without creating cache entries after complete eviction", async () => {
    mocks.deleteOwnerListing.mockResolvedValue(deletedListing)
    const {
      result,
      queryClient,
      ownerDetailKey,
      ownerListKey,
      publicDetailKey,
      savedListKey,
    } = setup()
    queryClient.clear()

    act(() => result.current.mutate("listing-1"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    for (const queryKey of [
      ownerDetailKey,
      ownerListKey,
      publicDetailKey,
      savedListKey,
    ]) {
      expect(
        queryClient.getQueryCache().find({ queryKey, exact: true }),
      ).toBeUndefined()
    }
  })
})
