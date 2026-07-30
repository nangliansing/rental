import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  cancelRelatedListingQueries,
  captureRelatedListingQueries,
  invalidateListingCollections,
  listingCollectionQueryKeys,
  optimisticallyDeleteListing,
  patchListingInRelatedQueries,
  relatedListingQueryKeys,
  removeDeletedListingDetails,
  restoreListingCacheSnapshot,
} from "./listingMutationCache"

function listing(id: string, extra: Record<string, unknown> = {}) {
  return { _id: id, rent: 10_000, ...extra }
}

describe("relatedListingQueryKeys", () => {
  it("includes every cache family that can hold a listing projection", () => {
    const keys = relatedListingQueryKeys("listing-1")

    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.listings.ownerDetail("listing-1"),
        queryKeys.listings.ownerLists,
        queryKeys.listings.publicListingDetails("listing-1"),
        queryKeys.mapSearch.listingsInBuilding,
        queryKeys.agentListings.lists,
        queryKeys.mapSearch.buildings,
        queryKeys.savedListings.all,
      ]),
    )
  })
})

describe("listingCollectionQueryKeys", () => {
  it("covers every collection that delete/update invalidates", () => {
    expect(listingCollectionQueryKeys).toEqual(
      expect.arrayContaining([
        queryKeys.listings.ownerLists,
        queryKeys.mapSearch.listingsInBuilding,
        queryKeys.agentListings.lists,
        queryKeys.mapSearch.buildings,
        queryKeys.savedListings.all,
      ]),
    )
  })
})

describe("patchListingInRelatedQueries", () => {
  it("patches the listing in every related query family", () => {
    const queryClient = new QueryClient()
    const relatedKeys = [
      ["owner-listing", "listing-1"],
      ["owner-listings", "all", "latest", 20],
      ["public-listing", "listing-1", "viewer-1"],
      ["search-listings-in-building", "building-1"],
      ["agent-listings", "agent-1"],
      queryKeys.mapSearch.buildingResults({
        bounds: { north: 14 },
        filters: {},
        limit: 20,
      }),
      queryKeys.mapSearch.nearbyBuildingResults({
        position: { lat: 13.7, lng: 100.6 },
        radiusMeters: 500,
        filters: {},
        limit: 20,
      }),
      queryKeys.mapSearch.nearLinesBuildingResults({
        geometry: {
          type: "LineString",
          coordinates: [
            [100.6, 13.7],
            [100.7, 13.8],
          ],
        },
        distanceMeters: 500,
        filters: {},
        limit: 20,
      }),
      ["saved-listings", 20],
    ] as const

    relatedKeys.forEach((queryKey) => {
      queryClient.setQueryData(queryKey, {
        nested: { listing: listing("listing-1") },
      })
    })

    patchListingInRelatedQueries(queryClient, "listing-1", { rent: 12_000 })

    relatedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryData(queryKey)).toEqual({
        nested: { listing: { _id: "listing-1", rent: 12_000 } },
      })
    })
  })

  it("patches availableAt through nested listing records", () => {
    const queryClient = new QueryClient()
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      _id: "listing-1",
      availableAt: null,
      rent: 10_000,
    })

    patchListingInRelatedQueries(queryClient, "listing-1", {
      availableAt: "2026-08-15",
    })

    expect(queryClient.getQueryData(publicKey)).toEqual({
      _id: "listing-1",
      availableAt: "2026-08-15",
      rent: 10_000,
    })
  })

  it("patches every occurrence when the same listing appears multiple times", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(key, {
      pages: [
        {
          data: {
            listings: [listing("listing-1", { visibility: "PUBLIC" })],
            featured: [listing("listing-1", { visibility: "PUBLIC" })],
          },
        },
      ],
      pageParams: [1],
    })

    patchListingInRelatedQueries(queryClient, "listing-1", {
      visibility: "PRIVATE",
    })

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [
        {
          data: {
            listings: [{ visibility: "PRIVATE" }],
            featured: [{ visibility: "PRIVATE" }],
          },
        },
      ],
    })
  })

  it("returns the same reference when changes are already applied", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.listings.ownerDetail("listing-1")
    const current = listing("listing-1", { visibility: "PRIVATE" })
    queryClient.setQueryData(key, current)

    patchListingInRelatedQueries(queryClient, "listing-1", {
      visibility: "PRIVATE",
    })

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("does not patch caches outside the related listing families", () => {
    const queryClient = new QueryClient()
    const key = ["reviews", "listing-1"] as const
    const current = { _id: "listing-1", rating: 5 }
    queryClient.setQueryData(key, current)

    patchListingInRelatedQueries(queryClient, "listing-1", { rent: 99_999 })

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("preserves untouched sibling listing references", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const keep = listing("listing-2", { rent: 8000 })
    const current = {
      data: [listing("listing-1"), keep],
      pagination: { total: 2 },
    }
    queryClient.setQueryData(key, current)

    patchListingInRelatedQueries(queryClient, "listing-1", { rent: 12_000 })

    const next = queryClient.getQueryData(key) as { data: unknown[] }
    expect(next.data[1]).toBe(keep)
    expect(next.data[0]).toMatchObject({ rent: 12_000 })
  })

  it("merges partial changes without dropping unrelated listing fields", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.listings.ownerDetail("listing-1")
    queryClient.setQueryData(key, listing("listing-1", {
      visibility: "PUBLIC",
      availableAt: "2026-01-01",
    }))

    patchListingInRelatedQueries(queryClient, "listing-1", {
      rent: 15_000,
    })

    expect(queryClient.getQueryData(key)).toEqual({
      _id: "listing-1",
      rent: 15_000,
      visibility: "PUBLIC",
      availableAt: "2026-01-01",
    })
  })

  it("patches embedded listings inside saved rows without removing the saved row", () => {
    const queryClient = new QueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: listing("listing-1", { rent: 9000 }),
                snapshot: { rent: 9000 },
              },
            ],
          },
        },
      ],
      pageParams: [1],
    })

    patchListingInRelatedQueries(queryClient, "listing-1", { rent: 9500 })

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: { rent: 9500 },
                snapshot: { rent: 9000 },
              },
            ],
          },
        },
      ],
    })
  })

  it("handles undefined cached queries without throwing", () => {
    const queryClient = new QueryClient()

    expect(() =>
      patchListingInRelatedQueries(queryClient, "listing-1", { rent: 1 }),
    ).not.toThrow()
  })
})

describe("captureRelatedListingQueries / restoreListingCacheSnapshot", () => {
  it("restores all captured variants after an optimistic failure", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "public", "latest", 20] as const
    const unrelatedKey = ["notifications"] as const
    queryClient.setQueryData(ownerKey, {
      listing: listing("listing-1", { visibility: "PUBLIC" }),
    })
    queryClient.setQueryData(unrelatedKey, { unread: 2 })

    const snapshot = captureRelatedListingQueries(queryClient, "listing-1")
    patchListingInRelatedQueries(queryClient, "listing-1", {
      visibility: "PRIVATE",
    })
    restoreListingCacheSnapshot(queryClient, snapshot)

    expect(queryClient.getQueryData(ownerKey)).toEqual({
      listing: { _id: "listing-1", rent: 10_000, visibility: "PUBLIC" },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unread: 2 })
  })

  it("dedupes overlapping prefixes when capturing", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, { data: [listing("listing-1")] })

    const snapshot = captureRelatedListingQueries(queryClient, "listing-1")

    expect(snapshot).toHaveLength(1)
    expect(snapshot[0]?.queryKey).toEqual(ownerKey)
  })

  it("captures every populated related family in one snapshot", () => {
    const queryClient = new QueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const ownerListKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(ownerDetailKey, listing("listing-1"))
    queryClient.setQueryData(ownerListKey, { data: [listing("listing-1")] })
    queryClient.setQueryData(savedKey, {
      pages: [{ data: { savedListings: [] } }],
      pageParams: [1],
    })

    const snapshot = captureRelatedListingQueries(queryClient, "listing-1")
    const capturedKeys = snapshot.map((entry) => entry.queryKey)

    expect(capturedKeys).toEqual(
      expect.arrayContaining([ownerDetailKey, ownerListKey, savedKey]),
    )
  })
})

describe("cancelRelatedListingQueries", () => {
  it("resolves without throwing when no queries are in flight", async () => {
    const queryClient = new QueryClient()

    await expect(
      cancelRelatedListingQueries(queryClient, "listing-1"),
    ).resolves.toBeUndefined()
  })
})

describe("removeDeletedListingDetails", () => {
  it("removes owner and public detail queries for the listing", () => {
    const queryClient = new QueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const publicDetailKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const ownerListKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerDetailKey, listing("listing-1"))
    queryClient.setQueryData(publicDetailKey, listing("listing-1"))
    queryClient.setQueryData(ownerListKey, { data: [listing("listing-1")] })

    removeDeletedListingDetails(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(publicDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(ownerListKey)).toBeDefined()
  })
})

describe("invalidateListingCollections", () => {
  it("invalidates every listing collection family", async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await invalidateListingCollections(queryClient)

    expect(invalidateSpy).toHaveBeenCalledTimes(
      listingCollectionQueryKeys.length,
    )
    listingCollectionQueryKeys.forEach((queryKey) => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey })
    })
  })
})

describe("optimisticallyDeleteListing", () => {
  it("removes collection listings but preserves saved snapshots", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "all"] as const
    const savedKey = ["saved-listings", 20] as const
    queryClient.setQueryData(ownerKey, {
      listings: [listing("listing-1"), listing("listing-2", { rent: 12_000 })],
    })
    queryClient.setQueryData(savedKey, {
      savedListings: [
        {
          _id: "saved-1",
          listingId: "listing-1",
          listing: listing("listing-1"),
          snapshot: { rent: 10_000 },
        },
      ],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toEqual({
      listings: [{ _id: "listing-2", rent: 12_000 }],
    })
    expect(queryClient.getQueryData(savedKey)).toEqual({
      savedListings: [
        {
          _id: "saved-1",
          listingId: "listing-1",
          listing: null,
          snapshot: { rent: 10_000 },
        },
      ],
    })
  })

  it("decrements totals only when pagination counts direct listings", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "all", "latest", 20] as const
    const buildingSearchKeys = [
      queryKeys.mapSearch.buildingResults({
        bounds: { north: 14 },
        filters: {},
        limit: 20,
      }),
      queryKeys.mapSearch.nearbyBuildingResults({
        position: { lat: 13.7, lng: 100.6 },
        radiusMeters: 500,
        filters: {},
        limit: 20,
      }),
      queryKeys.mapSearch.nearLinesBuildingResults({
        geometry: {
          type: "LineString",
          coordinates: [
            [100.6, 13.7],
            [100.7, 13.8],
          ],
        },
        distanceMeters: 500,
        filters: {},
        limit: 20,
      }),
    ] as const
    queryClient.setQueryData(ownerKey, {
      pageParams: [1],
      pages: [
        {
          data: [listing("listing-1"), listing("listing-2")],
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
    })
    buildingSearchKeys.forEach((queryKey) => {
      queryClient.setQueryData(queryKey, {
        data: [
          {
            _id: "building-1",
            listings: [listing("listing-1")],
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      })
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      pages: [{ data: [{ _id: "listing-2" }], pagination: { total: 1 } }],
    })
    buildingSearchKeys.forEach((queryKey) => {
      expect(queryClient.getQueryData(queryKey)).toMatchObject({
        data: [{ _id: "building-1", listings: [] }],
        pagination: { total: 1 },
      })
    })
  })

  it("keeps every infinite page total consistent after removing one listing", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 1,
    })
    queryClient.setQueryData(ownerKey, {
      pageParams: [1, 2],
      pages: [
        {
          data: [listing("listing-1")],
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          data: [listing("listing-2")],
          pagination: { page: 2, limit: 1, total: 2 },
        },
      ],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      pages: [
        { data: [], pagination: { total: 1 } },
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
    })
  })

  it("marks remaining listing copies private without removing detail records", () => {
    const queryClient = new QueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(ownerDetailKey, listing("listing-1", { visibility: "PUBLIC" }))
    queryClient.setQueryData(publicKey, listing("listing-1", { visibility: "PUBLIC" }))

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      _id: "listing-1",
      visibility: "PRIVATE",
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      _id: "listing-1",
      visibility: "PRIVATE",
    })
  })

  it("removes from named listing containers under data", () => {
    const queryClient = new QueryClient()
    const agentKey = queryKeys.agentListings.list({
      agentProfileId: "agent-1",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(agentKey, {
      data: {
        listings: [listing("listing-1"), listing("listing-2")],
      },
      pagination: { total: 2 },
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(agentKey)).toMatchObject({
      data: { listings: [{ _id: "listing-2" }] },
      pagination: { total: 1 },
    })
  })

  it("does not remove saved-list rows themselves", () => {
    const queryClient = new QueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: listing("listing-1"),
                snapshot: { rent: 10_000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: null,
                snapshot: { rent: 10_000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
    })
  })

  it("is a no-op on absent listing data without throwing", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const current = {
      data: [listing("listing-2")],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(ownerKey, current)

    expect(() =>
      optimisticallyDeleteListing(queryClient, "listing-1"),
    ).not.toThrow()
    expect(queryClient.getQueryData(ownerKey)).toEqual(current)
  })

  it("dedupes overlapping collection prefixes to one write per cached query", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listing("listing-1"), listing("listing-2")],
      pagination: { total: 2 },
    })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    optimisticallyDeleteListing(queryClient, "listing-1")

    const ownerWrites = setQueryData.mock.calls.filter(
      ([key]) => JSON.stringify(key) === JSON.stringify(ownerKey),
    )
    expect(ownerWrites).toHaveLength(2)
    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
  })

  it("clamps collection totals at zero when removing every direct listing row", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listing("listing-1"), listing("listing-1")],
      pagination: { total: 1 },
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [],
      pagination: { total: 0 },
    })
  })

  it("leaves non-finite pagination totals unchanged", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listing("listing-1")],
      pagination: { total: Number.NaN },
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [],
      pagination: { total: Number.NaN },
    })
  })

  it("removes duplicate listing rows from the same collection page", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listing("listing-1"), listing("listing-1"), listing("listing-2")],
      pagination: { total: 3 },
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
  })

  it("handles empty infinite-list caches without throwing", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const current = { pages: [], pageParams: [] }
    queryClient.setQueryData(ownerKey, current)

    expect(() =>
      optimisticallyDeleteListing(queryClient, "listing-1"),
    ).not.toThrow()
    expect(queryClient.getQueryData(ownerKey)).toEqual(current)
  })

  it("does not touch unrelated caches", () => {
    const queryClient = new QueryClient()
    const unrelatedKey = queryKeys.notifications.me
    const unrelated = { unreadCount: 4 }
    queryClient.setQueryData(unrelatedKey, unrelated)

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelated)
  })

  it("leaves saved rows unchanged when the embedded listing is already null", () => {
    const queryClient = new QueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const current = {
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: null,
                snapshot: { rent: 10_000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(savedKey, current)

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(savedKey)).toEqual(current)
  })

  it("removes from listings-in-building infinite pages and nested building listings", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(key, {
      pages: [
        {
          data: {
            listings: [listing("listing-1"), listing("listing-2")],
          },
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [
        {
          data: { listings: [{ _id: "listing-2" }] },
          pagination: { total: 1 },
        },
      ],
    })
  })

  it("removes from bare top-level listing arrays used by legacy cache shapes", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "all"] as const
    queryClient.setQueryData(ownerKey, {
      listings: [listing("listing-1"), listing("listing-2")],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toEqual({
      listings: [{ _id: "listing-2", rent: 10_000 }],
    })
  })

  it("combines removal, saved-list nulling, and visibility patching in one delete", () => {
    const queryClient = new QueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(ownerKey, {
      data: [listing("listing-1", { visibility: "PUBLIC" }), listing("listing-2")],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(ownerDetailKey, listing("listing-1", { visibility: "PUBLIC" }))
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listingId: "listing-1",
                listing: listing("listing-1", { visibility: "PUBLIC" }),
                snapshot: { rent: 10_000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    optimisticallyDeleteListing(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      visibility: "PRIVATE",
    })
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: {
            savedListings: [
              {
                listingId: "listing-1",
                listing: null,
                snapshot: { rent: 10_000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
    })
  })
})
