import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  applyDeletedSavedListingToCache,
  patchListingSavedStateInCache,
  relatedSavedListingQueryKeys,
  syncListingSavedState,
} from "./savedListingCache"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function listingRow(listingId: string, isSavedByMe: boolean) {
  return { _id: listingId, rent: 12_000, isSavedByMe }
}

function savedRow(savedId: string, listingId: string) {
  return { _id: savedId, listingId }
}

describe("relatedSavedListingQueryKeys", () => {
  it("includes every cache family that can show isSavedByMe or saved rows", () => {
    expect(relatedSavedListingQueryKeys).toEqual(
      expect.arrayContaining([
        queryKeys.savedListings.all,
        queryKeys.listings.ownerLists,
        queryKeys.listings.ownerDetails,
        queryKeys.listings.publicDetails,
        queryKeys.agentListings.lists,
        queryKeys.mapSearch.buildings,
        queryKeys.mapSearch.listingsInBuilding,
      ]),
    )
  })
})

describe("patchListingSavedStateInCache", () => {
  it("patches isSavedByMe on nested listing records across related families", () => {
    const queryClient = createQueryClient()
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const agentKey = queryKeys.agentListings.list({
      agentProfileId: "agent-1",
      sort: "latest",
      limit: 20,
    })
    const publicData = {
      success: true,
      data: {
        listing: listingRow("listing-1", false),
      },
    }
    const agentData = {
      listings: [listingRow("listing-1", false)],
    }
    queryClient.setQueryData(publicKey, publicData)
    queryClient.setQueryData(agentKey, agentData)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      data: { listing: { isSavedByMe: true } },
    })
    expect(queryClient.getQueryData(agentKey)).toMatchObject({
      listings: [{ isSavedByMe: true }],
    })
  })

  it("patches listings matched by buildingId without rent", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.ownerDetail("listing-1")
    queryClient.setQueryData(key, {
      _id: "listing-1",
      buildingId: "building-1",
      isSavedByMe: false,
    })

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(key)).toMatchObject({
      isSavedByMe: true,
    })
  })

  it("patches listings that only expose isSavedByMe", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(key, {
      listing: { _id: "listing-1", isSavedByMe: false },
    })

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(key)).toMatchObject({
      listing: { isSavedByMe: true },
    })
  })

  it("patches every related family without touching unrelated caches", () => {
    const queryClient = createQueryClient()
    const ownerListKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const buildingKey = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const unrelatedKey = queryKeys.notifications.me
    const unrelated = { unreadCount: 3 }
    queryClient.setQueryData(ownerListKey, {
      data: [listingRow("listing-1", false)],
      pagination: { total: 1 },
    })
    queryClient.setQueryData(ownerDetailKey, listingRow("listing-1", false))
    queryClient.setQueryData(buildingKey, {
      data: [{ _id: "building-1", listings: [listingRow("listing-1", false)] }],
      pagination: { total: 1 },
    })
    queryClient.setQueryData(unrelatedKey, unrelated)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(ownerListKey)).toMatchObject({
      data: [{ isSavedByMe: true }],
    })
    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      isSavedByMe: true,
    })
    expect(queryClient.getQueryData(buildingKey)).toMatchObject({
      data: [{ listings: [{ isSavedByMe: true }] }],
    })
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelated)
  })

  it("dedupes overlapping prefixes to one write per cached query", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              {
                ...savedRow("saved-1", "listing-1"),
                listing: listingRow("listing-1", false),
              },
            ],
          },
        },
      ],
      pageParams: [1],
    })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{ data: { savedListings: [{ listing: { isSavedByMe: true } }] } }],
    })
  })

  it("does not patch records that share an id but are not listings", () => {
    const queryClient = createQueryClient()
    const key = ["profiles", "listing-1"] as const
    const current = { _id: "listing-1", displayName: "Owner" }
    queryClient.setQueryData(key, current)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("does not patch saved-list rows by listing id", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const current = {
      pages: [
        {
          data: {
            savedListings: [savedRow("saved-1", "listing-1")],
          },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(savedKey, current)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(savedKey)).toEqual(current)
  })

  it("returns the same reference when isSavedByMe is already correct", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.publicDetail("listing-1", "user-1")
    const listing = listingRow("listing-1", true)
    const current = { data: { listing } }
    queryClient.setQueryData(key, current)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("patches multiple occurrences of the same listing in one cache", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(key, {
      pages: [
        {
          data: {
            listings: [listingRow("listing-1", false)],
            featured: [listingRow("listing-1", false)],
          },
        },
      ],
      pageParams: [1],
    })

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [
        {
          data: {
            listings: [{ isSavedByMe: true }],
            featured: [{ isSavedByMe: true }],
          },
        },
      ],
    })
  })

  it("preserves untouched sibling listing references", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const keep = listingRow("listing-2", false)
    const current = {
      data: [listingRow("listing-1", false), keep],
      pagination: { total: 2 },
    }
    queryClient.setQueryData(key, current)

    patchListingSavedStateInCache({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    const next = queryClient.getQueryData(key) as {
      data: unknown[]
    }
    expect(next.data[1]).toBe(keep)
    expect(next.data[0]).toMatchObject({ isSavedByMe: true })
  })
})

describe("applyDeletedSavedListingToCache", () => {
  it("clears saved rows and marks listing copies unsaved", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              savedRow("saved-1", "listing-1"),
              savedRow("saved-2", "listing-2"),
            ],
          },
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(publicKey, {
      listing: listingRow("listing-1", true),
    })

    applyDeletedSavedListingToCache(queryClient, "listing-1")

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: { savedListings: [{ listingId: "listing-2" }] },
          pagination: { total: 1 },
        },
      ],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { isSavedByMe: false },
    })
  })

  it("preserves embedded listing snapshots inside saved rows", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              {
                ...savedRow("saved-1", "listing-1"),
                listing: listingRow("listing-1", true),
                snapshot: { rent: 9000 },
              },
            ],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    applyDeletedSavedListingToCache(queryClient, "listing-1")

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{ data: { savedListings: [] }, pagination: { total: 0 } }],
    })
  })

  it("still patches listing flags when the saved row is already absent", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: { savedListings: [savedRow("saved-2", "listing-2")] },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(publicKey, {
      listing: listingRow("listing-1", true),
    })

    applyDeletedSavedListingToCache(queryClient, "listing-1")

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{ data: { savedListings: [{ listingId: "listing-2" }] } }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { isSavedByMe: false },
    })
  })

  it("does not remove listing records from owner collections", () => {
    const queryClient = createQueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listingRow("listing-1", true), listingRow("listing-2", false)],
      pagination: { total: 2 },
    })

    applyDeletedSavedListingToCache(queryClient, "listing-1")

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [
        { _id: "listing-1", isSavedByMe: false },
        { _id: "listing-2", isSavedByMe: false },
      ],
      pagination: { total: 2 },
    })
  })
})

describe("syncListingSavedState", () => {
  it("patches listing caches without invalidating the visible listing", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const publicKey = queryKeys.listings.publicDetail("listing-1")
    const buildingListingsKey = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(publicKey, {
      success: true,
      data: {
        listing: listingRow("listing-1", false),
      },
    })
    queryClient.setQueryData(buildingListingsKey, {
      pages: [
        {
          data: {
            listings: [listingRow("listing-1", false)],
          },
        },
      ],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      data: { listing: { isSavedByMe: true } },
    })
    expect(queryClient.getQueryData(buildingListingsKey)).toMatchObject({
      pages: [{ data: { listings: [{ isSavedByMe: true }] } }],
    })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.savedListings.all,
    })
  })

  it("does not invalidate owner, agent, or map caches on save", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerKey, {
      data: [listingRow("listing-1", false)],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.savedListings.all,
    })
  })

  it("removes an unsaved item locally without refetching any query", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const agentKey = queryKeys.agentListings.list({
      agentProfileId: "agent-1",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              savedRow("saved-1", "listing-1"),
              savedRow("saved-2", "listing-2"),
            ],
          },
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(agentKey, {
      listings: [listingRow("listing-1", true)],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: { savedListings: [{ listingId: "listing-2" }] },
          pagination: { total: 1 },
        },
      ],
    })
    expect(queryClient.getQueryData(agentKey)).toMatchObject({
      listings: [{ isSavedByMe: false }],
    })
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it("keeps every infinite page total consistent after removal", async () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 1 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [savedRow("saved-1", "listing-1")],
          },
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          data: {
            savedListings: [savedRow("saved-2", "listing-2")],
          },
          pagination: { page: 2, limit: 1, total: 2 },
        },
      ],
      pageParams: [1, 2],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: { savedListings: [] },
          pagination: { total: 1 },
        },
        {
          data: { savedListings: [{ listingId: "listing-2" }] },
          pagination: { total: 1 },
        },
      ],
    })
  })

  it("does not remove listing records from non-saved-list caches on unsave", async () => {
    const queryClient = createQueryClient()
    const ownerKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const ownerData = {
      data: [listingRow("listing-1", true), listingRow("listing-2", false)],
      pagination: { total: 2 },
    }
    queryClient.setQueryData(ownerKey, ownerData)

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      data: [
        { _id: "listing-1", isSavedByMe: false },
        { _id: "listing-2", isSavedByMe: false },
      ],
      pagination: { total: 2 },
    })
  })

  it("is a no-op on saved-list caches when unsaving a listing that was never saved", async () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const current = {
      pages: [
        {
          data: { savedListings: [savedRow("saved-2", "listing-2")] },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(savedKey, current)

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    expect(queryClient.getQueryData(savedKey)).toEqual(current)
  })

  it("clamps saved-list totals at zero when removing the last rows", async () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [
        {
          data: {
            savedListings: [
              savedRow("saved-1", "listing-1"),
              savedRow("saved-2", "listing-1"),
            ],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{ data: { savedListings: [] }, pagination: { total: 0 } }],
    })
  })

  it("handles empty saved-list caches without throwing", async () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    queryClient.setQueryData(savedKey, {
      pages: [],
      pageParams: [],
    })

    await expect(
      syncListingSavedState({
        queryClient,
        listingId: "listing-1",
        isSaved: false,
      }),
    ).resolves.toBeUndefined()

    expect(queryClient.getQueryData(savedKey)).toEqual({
      pages: [],
      pageParams: [],
    })
  })

  it("handles undefined cached queries without throwing", async () => {
    const queryClient = createQueryClient()

    await expect(
      syncListingSavedState({
        queryClient,
        listingId: "listing-1",
        isSaved: true,
      }),
    ).resolves.toBeUndefined()
  })

  it("matches applyDeletedSavedListingToCache for the unsave path", async () => {
    const buildClient = () => {
      const queryClient = createQueryClient()
      const savedKey = queryKeys.savedListings.list({ limit: 20 })
      const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
      const seed = {
        saved: {
          pages: [
            {
              data: {
                savedListings: [
                  savedRow("saved-1", "listing-1"),
                  savedRow("saved-2", "listing-2"),
                ],
              },
              pagination: { total: 2 },
            },
          ],
          pageParams: [1],
        },
        public: { listing: listingRow("listing-1", true) },
      }
      queryClient.setQueryData(savedKey, seed.saved)
      queryClient.setQueryData(publicKey, seed.public)
      return { queryClient, savedKey, publicKey }
    }

    const syncClient = buildClient()
    await syncListingSavedState({
      queryClient: syncClient.queryClient,
      listingId: "listing-1",
      isSaved: false,
    })

    const deleteClient = buildClient()
    applyDeletedSavedListingToCache(deleteClient.queryClient, "listing-1")

    expect(syncClient.queryClient.getQueryData(syncClient.savedKey)).toEqual(
      deleteClient.queryClient.getQueryData(deleteClient.savedKey),
    )
    expect(syncClient.queryClient.getQueryData(syncClient.publicKey)).toEqual(
      deleteClient.queryClient.getQueryData(deleteClient.publicKey),
    )
  })
})
