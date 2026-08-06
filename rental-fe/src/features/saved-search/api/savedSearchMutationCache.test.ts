import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { SavedSearch } from "./savedSearchParsers"
import {
  createOptimisticClosedSavedSearch,
  createOptimisticDeletedSavedSearch,
  createOptimisticUpdatedSavedSearch,
  findOwnerSavedSearch,
  ownerSavedSearchCachePlan,
  readOwnerSavedSearchCache,
  removeOwnerSavedSearchFromLists,
  softDeleteOwnerSavedSearchCache,
  updateOwnerSavedSearchCache,
  type OwnerSavedSearchesInfiniteData,
} from "./savedSearchMutationCache"

const request = (
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

const infinite = (...items: SavedSearch[]): OwnerSavedSearchesInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    },
  ],
})

describe("savedSearchMutationCache", () => {
  it("builds cancel/snapshot/invalidate plans around lists + detail", () => {
    expect(ownerSavedSearchCachePlan("request-1")).toEqual({
      cancel: [
        queryKeys.savedSearches.ownerLists,
        queryKeys.savedSearches.ownerDetail("request-1"),
      ],
      snapshot: [queryKeys.savedSearches.ownerLists],
      snapshotExact: [queryKeys.savedSearches.ownerDetail("request-1")],
      invalidate: [
        queryKeys.savedSearches.ownerLists,
        queryKeys.savedSearches.ownerDetail("request-1"),
      ],
    })
  })

  it("creates an optimistic Closed copy without mutating the source", () => {
    const source = request("request-1", "Waiting")
    const closed = createOptimisticClosedSavedSearch(source)

    expect(closed).toEqual({ ...source, status: "Closed" })
    expect(source.status).toBe("Waiting")
  })

  it("creates an optimistic content patch without changing status", () => {
    const source = request("request-1", "Waiting")
    const updated = createOptimisticUpdatedSavedSearch(source, {
      name: "  Renamed  ",
      description: "  Notes  ",
      filters: { maxRent: 40000, buildingFacilities: ["Parking", ""] },
    })

    expect(updated).toMatchObject({
      _id: "request-1",
      name: "Renamed",
      description: "Notes",
      status: "Waiting",
      filters: { maxRent: 40000, buildingFacilities: ["Parking"] },
    })
    expect(source.name).toBe("Request request-1")
  })

  it("clears description and replaces geoSearch while preserving Closed status", () => {
    const source = request("request-1", "Closed")
    const geoSearch = {
      mode: "nearby" as const,
      position: { lat: 13.73, lng: 100.54 },
      radiusMeters: 500,
      placeName: "  Siam  ",
    }

    expect(
      createOptimisticUpdatedSavedSearch(source, {
        description: "   ",
        geoSearch,
      }),
    ).toMatchObject({
      status: "Closed",
      description: null,
      geoSearch: {
        mode: "nearby",
        position: { lat: 13.73, lng: 100.54 },
        radiusMeters: 500,
        placeName: "Siam",
      },
    })
  })

  it("creates an optimistic deleted copy without mutating the source", () => {
    const source = request("request-1", "Waiting")
    const deleted = createOptimisticDeletedSavedSearch(
      source,
      "2026-08-04T02:00:00.000Z",
    )

    expect(deleted).toEqual({
      ...source,
      isDeleted: true,
      deletedAt: "2026-08-04T02:00:00.000Z",
    })
    expect(source.isDeleted).toBe(false)
    expect(source.deletedAt).toBeNull()
  })

  it("removes from Waiting and Closed lists and marks detail deleted", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const closedKey = queryKeys.savedSearches.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(
      waitingKey,
      infinite(source, request("request-2")),
    )
    queryClient.setQueryData(
      closedKey,
      infinite(request("request-1", "Closed"), request("old", "Closed")),
    )
    queryClient.setQueryData(detailKey, source)

    softDeleteOwnerSavedSearchCache(
      queryClient,
      "request-1",
      createOptimisticDeletedSavedSearch(
        source,
        "2026-08-04T02:00:00.000Z",
      ),
    )

    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-2"])
    expect(
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: true,
      deletedAt: "2026-08-04T02:00:00.000Z",
      status: "Waiting",
    })
  })

  it("decrements multi-page totals when removing from every owner list", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 1,
    })
    const closedKey = queryKeys.savedSearches.ownerList({
      status: "Closed",
      limit: 20,
    })

    queryClient.setQueryData(waitingKey, {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [request("request-1")],
          pagination: { page: 1, limit: 1, total: 3 },
        },
        {
          success: true,
          data: [request("request-2"), request("request-3")],
          pagination: { page: 2, limit: 1, total: 3 },
        },
      ],
    } satisfies OwnerSavedSearchesInfiniteData)
    queryClient.setQueryData(
      closedKey,
      infinite(request("request-1", "Closed"), request("old", "Closed")),
    )

    removeOwnerSavedSearchFromLists(queryClient, "request-1")

    const waitingPages =
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages
    expect(waitingPages?.[0]?.data.map(item => item._id)).toEqual([])
    expect(waitingPages?.[0]?.pagination.total).toBe(2)
    expect(waitingPages?.[1]?.data.map(item => item._id)).toEqual([
      "request-2",
      "request-3",
    ])
    expect(waitingPages?.[1]?.pagination.total).toBe(2)
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
  })

  it("finds a request from detail or Waiting lists", () => {
    const detail = request("request-1")
    const lists: [
      readonly unknown[],
      OwnerSavedSearchesInfiniteData | undefined,
    ][] = [
      [
        queryKeys.savedSearches.ownerList({ status: "Waiting", limit: 20 }),
        infinite(request("request-2"), detail),
      ],
    ]

    expect(findOwnerSavedSearch(detail, lists, "request-1")?._id).toBe(
      "request-1",
    )
    expect(findOwnerSavedSearch(undefined, lists, "request-2")?._id).toBe(
      "request-2",
    )
    expect(findOwnerSavedSearch(undefined, lists, "missing")).toBeUndefined()
  })

  it("removes from Waiting, patches detail, and leaves Closed lists alone", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const waitingOtherLimitKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 40,
    })
    const closedKey = queryKeys.savedSearches.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(
      waitingKey,
      infinite(source, request("request-2")),
    )
    queryClient.setQueryData(waitingOtherLimitKey, infinite(source))
    queryClient.setQueryData(closedKey, infinite(request("old", "Closed")))
    queryClient.setQueryData(detailKey, source)

    const cache = readOwnerSavedSearchCache(queryClient, "request-1")
    updateOwnerSavedSearchCache(
      queryClient,
      cache,
      createOptimisticClosedSavedSearch(source),
    )

    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-2"])
    expect(
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(waitingOtherLimitKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual([])
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Closed",
    })
  })

  it("patches Waiting lists in place and leaves Closed lists alone for content updates", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const waitingOtherLimitKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 40,
    })
    const closedKey = queryKeys.savedSearches.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(
      waitingKey,
      infinite(source, request("request-2")),
    )
    queryClient.setQueryData(waitingOtherLimitKey, infinite(source))
    queryClient.setQueryData(closedKey, infinite(request("old", "Closed")))
    queryClient.setQueryData(detailKey, source)

    updateOwnerSavedSearchCache(
      queryClient,
      readOwnerSavedSearchCache(queryClient, "request-1"),
      createOptimisticUpdatedSavedSearch(source, {
        name: "Renamed",
        description: "Notes",
      }),
    )

    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-1", "request-2"])
    expect(
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({ name: "Renamed", description: "Notes", status: "Waiting" })
    expect(
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(2)
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(waitingOtherLimitKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({ name: "Renamed" })
    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Renamed",
      status: "Waiting",
    })
  })

  it("patches Closed list content in place when the cached status remains Closed", () => {
    const queryClient = new QueryClient()
    const closedKey = queryKeys.savedSearches.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = request("request-1", "Closed")

    queryClient.setQueryData(closedKey, infinite(source))
    queryClient.setQueryData(detailKey, source)

    updateOwnerSavedSearchCache(
      queryClient,
      readOwnerSavedSearchCache(queryClient, "request-1"),
      createOptimisticUpdatedSavedSearch(source, { name: "Closed rename" }),
    )

    expect(
      queryClient
        .getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({
      name: "Closed rename",
      status: "Closed",
    })
    expect(
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(closedKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
  })

  it("decrements multi-page Waiting totals by the global removed count", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 1,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(waitingKey, {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [source],
          pagination: { page: 1, limit: 1, total: 3 },
        },
        {
          success: true,
          data: [request("request-2"), request("request-3")],
          pagination: { page: 2, limit: 1, total: 3 },
        },
      ],
    } satisfies OwnerSavedSearchesInfiniteData)
    queryClient.setQueryData(detailKey, source)

    updateOwnerSavedSearchCache(
      queryClient,
      readOwnerSavedSearchCache(queryClient, "request-1"),
      createOptimisticClosedSavedSearch(source),
    )

    const pages =
      queryClient.getQueryData<OwnerSavedSearchesInfiniteData>(waitingKey)
        ?.pages
    expect(pages?.[0]?.data.map(item => item._id)).toEqual([])
    expect(pages?.[0]?.pagination.total).toBe(2)
    expect(pages?.[1]?.data.map(item => item._id)).toEqual([
      "request-2",
      "request-3",
    ])
    expect(pages?.[1]?.pagination.total).toBe(2)
  })
})
