import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { ClientRequest } from "./clientRequestParsers"
import {
  createOptimisticClosedClientRequest,
  createOptimisticDeletedClientRequest,
  createOptimisticUpdatedClientRequest,
  findOwnerClientRequest,
  ownerClientRequestCachePlan,
  readOwnerClientRequestCache,
  removeOwnerClientRequestFromLists,
  softDeleteOwnerClientRequestCache,
  updateOwnerClientRequestCache,
  type OwnerClientRequestsInfiniteData,
} from "./clientRequestMutationCache"

const request = (
  id: string,
  status: ClientRequest["status"] = "Waiting",
): ClientRequest =>
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
  }) as ClientRequest

const infinite = (...items: ClientRequest[]): OwnerClientRequestsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    },
  ],
})

describe("clientRequestMutationCache", () => {
  it("builds cancel/snapshot/invalidate plans around lists + detail", () => {
    expect(ownerClientRequestCachePlan("request-1")).toEqual({
      cancel: [
        queryKeys.clientRequests.ownerLists,
        queryKeys.clientRequests.ownerDetail("request-1"),
      ],
      snapshot: [queryKeys.clientRequests.ownerLists],
      snapshotExact: [queryKeys.clientRequests.ownerDetail("request-1")],
      invalidate: [
        queryKeys.clientRequests.ownerLists,
        queryKeys.clientRequests.ownerDetail("request-1"),
      ],
    })
  })

  it("creates an optimistic Closed copy without mutating the source", () => {
    const source = request("request-1", "Waiting")
    const closed = createOptimisticClosedClientRequest(source)

    expect(closed).toEqual({ ...source, status: "Closed" })
    expect(source.status).toBe("Waiting")
  })

  it("creates an optimistic content patch without changing status", () => {
    const source = request("request-1", "Waiting")
    const updated = createOptimisticUpdatedClientRequest(source, {
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
      createOptimisticUpdatedClientRequest(source, {
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
    const deleted = createOptimisticDeletedClientRequest(
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
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const closedKey = queryKeys.clientRequests.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
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

    softDeleteOwnerClientRequestCache(
      queryClient,
      "request-1",
      createOptimisticDeletedClientRequest(
        source,
        "2026-08-04T02:00:00.000Z",
      ),
    )

    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-2"])
    expect(
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
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
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 1,
    })
    const closedKey = queryKeys.clientRequests.ownerList({
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
    } satisfies OwnerClientRequestsInfiniteData)
    queryClient.setQueryData(
      closedKey,
      infinite(request("request-1", "Closed"), request("old", "Closed")),
    )

    removeOwnerClientRequestFromLists(queryClient, "request-1")

    const waitingPages =
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
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
        .getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
  })

  it("finds a request from detail or Waiting lists", () => {
    const detail = request("request-1")
    const lists: [
      readonly unknown[],
      OwnerClientRequestsInfiniteData | undefined,
    ][] = [
      [
        queryKeys.clientRequests.ownerList({ status: "Waiting", limit: 20 }),
        infinite(request("request-2"), detail),
      ],
    ]

    expect(findOwnerClientRequest(detail, lists, "request-1")?._id).toBe(
      "request-1",
    )
    expect(findOwnerClientRequest(undefined, lists, "request-2")?._id).toBe(
      "request-2",
    )
    expect(findOwnerClientRequest(undefined, lists, "missing")).toBeUndefined()
  })

  it("removes from Waiting, patches detail, and leaves Closed lists alone", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const waitingOtherLimitKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 40,
    })
    const closedKey = queryKeys.clientRequests.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(
      waitingKey,
      infinite(source, request("request-2")),
    )
    queryClient.setQueryData(waitingOtherLimitKey, infinite(source))
    queryClient.setQueryData(closedKey, infinite(request("old", "Closed")))
    queryClient.setQueryData(detailKey, source)

    const cache = readOwnerClientRequestCache(queryClient, "request-1")
    updateOwnerClientRequestCache(
      queryClient,
      cache,
      createOptimisticClosedClientRequest(source),
    )

    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-2"])
    expect(
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(waitingOtherLimitKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual([])
    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Closed",
    })
  })

  it("patches Waiting lists in place and leaves Closed lists alone for content updates", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const waitingOtherLimitKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 40,
    })
    const closedKey = queryKeys.clientRequests.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = request("request-1", "Waiting")

    queryClient.setQueryData(
      waitingKey,
      infinite(source, request("request-2")),
    )
    queryClient.setQueryData(waitingOtherLimitKey, infinite(source))
    queryClient.setQueryData(closedKey, infinite(request("old", "Closed")))
    queryClient.setQueryData(detailKey, source)

    updateOwnerClientRequestCache(
      queryClient,
      readOwnerClientRequestCache(queryClient, "request-1"),
      createOptimisticUpdatedClientRequest(source, {
        name: "Renamed",
        description: "Notes",
      }),
    )

    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["request-1", "request-2"])
    expect(
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({ name: "Renamed", description: "Notes", status: "Waiting" })
    expect(
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
        ?.pages[0]?.pagination.total,
    ).toBe(2)
    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(waitingOtherLimitKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({ name: "Renamed" })
    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
        ?.pages[0]?.data.map(item => item._id),
    ).toEqual(["old"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Renamed",
      status: "Waiting",
    })
  })

  it("patches Closed list content in place when the cached status remains Closed", () => {
    const queryClient = new QueryClient()
    const closedKey = queryKeys.clientRequests.ownerList({
      status: "Closed",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = request("request-1", "Closed")

    queryClient.setQueryData(closedKey, infinite(source))
    queryClient.setQueryData(detailKey, source)

    updateOwnerClientRequestCache(
      queryClient,
      readOwnerClientRequestCache(queryClient, "request-1"),
      createOptimisticUpdatedClientRequest(source, { name: "Closed rename" }),
    )

    expect(
      queryClient
        .getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
        ?.pages[0]?.data[0],
    ).toMatchObject({
      name: "Closed rename",
      status: "Closed",
    })
    expect(
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(closedKey)
        ?.pages[0]?.pagination.total,
    ).toBe(1)
  })

  it("decrements multi-page Waiting totals by the global removed count", () => {
    const queryClient = new QueryClient()
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 1,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
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
    } satisfies OwnerClientRequestsInfiniteData)
    queryClient.setQueryData(detailKey, source)

    updateOwnerClientRequestCache(
      queryClient,
      readOwnerClientRequestCache(queryClient, "request-1"),
      createOptimisticClosedClientRequest(source),
    )

    const pages =
      queryClient.getQueryData<OwnerClientRequestsInfiniteData>(waitingKey)
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
