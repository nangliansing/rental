import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  applyDeletedBuildingFollowToCache,
  patchBuildingFollowingStateInCache,
  readBuildingFollowingFromCache,
  relatedBuildingFollowQueryKeys,
  syncBuildingFollowingState,
} from "./buildingFollowCache"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function buildingRow(buildingId: string, isFollowing: boolean) {
  return {
    _id: buildingId,
    name: "Sample Building",
    buildingType: "Apartment",
    isFollowing,
  }
}

function followRow(followId: string, buildingId: string) {
  return { _id: followId, buildingId }
}

describe("relatedBuildingFollowQueryKeys", () => {
  it("includes every cache family that can show isFollowing or follow rows", () => {
    expect(relatedBuildingFollowQueryKeys).toEqual(
      expect.arrayContaining([
        queryKeys.buildingFollows.all,
        queryKeys.buildings.all,
        queryKeys.mapSearch.buildings,
        queryKeys.mapSearch.listingsInBuilding,
        queryKeys.listings.publicDetails,
        queryKeys.listings.ownerDetails,
      ]),
    )
  })
})

describe("readBuildingFollowingFromCache", () => {
  it("returns undefined when no related cache entry contains the building", () => {
    const queryClient = createQueryClient()

    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBeUndefined()
  })

  it("ignores nested buildings inside followings list snapshots", () => {
    const queryClient = createQueryClient()
    const followsKey = queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 })
    const buildingKey = queryKeys.buildings.detail("building-1")

    queryClient.setQueryData(buildingKey, buildingRow("building-1", true))
    queryClient.setQueryData(followsKey, {
      pages: [
        {
          data: {
            followings: [
              {
                _id: "follow-1",
                buildingId: "building-1",
                building: buildingRow("building-1", false),
              },
            ],
          },
          pagination: { page: 1, limit: 20, total: 1 },
        },
      ],
      pageParams: [1],
    })

    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBe(true)
  })

  it("reads isFollowing from related cache families", () => {
    const queryClient = createQueryClient()
    const buildingKey = queryKeys.buildings.detail("building-1")
    const mapKey = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const listingsKey = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")

    queryClient.setQueryData(buildingKey, buildingRow("building-1", true))
    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBe(true)

    queryClient.removeQueries({ queryKey: buildingKey })
    queryClient.setQueryData(listingsKey, {
      pages: [
        {
          data: {
            building: buildingRow("building-1", false),
            listings: [],
          },
        },
      ],
      pageParams: [1],
    })
    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBe(false)

    queryClient.removeQueries({ queryKey: listingsKey })
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: buildingRow("building-1", true),
      },
    })
    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBe(true)

    queryClient.removeQueries({ queryKey: publicKey })
    queryClient.setQueryData(mapKey, {
      data: [buildingRow("building-1", false)],
      pagination: { total: 1 },
    })
    expect(readBuildingFollowingFromCache(queryClient, "building-1")).toBe(false)
  })
})

describe("patchBuildingFollowingStateInCache", () => {
  it("patches isFollowing on building records across related families", () => {
    const queryClient = createQueryClient()
    const buildingKey = queryKeys.buildings.detail("building-1")
    const mapKey = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(buildingKey, buildingRow("building-1", false))
    queryClient.setQueryData(mapKey, {
      data: [buildingRow("building-1", false)],
      pagination: { total: 1 },
    })

    patchBuildingFollowingStateInCache({
      queryClient,
      buildingId: "building-1",
      isFollowing: true,
    })

    expect(queryClient.getQueryData(buildingKey)).toMatchObject({
      isFollowing: true,
    })
    expect(queryClient.getQueryData(mapKey)).toMatchObject({
      data: [{ isFollowing: true }],
    })
  })

  it("patches nested building headers in listings-in-building caches", () => {
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
            building: buildingRow("building-1", false),
            listings: [],
          },
        },
      ],
      pageParams: [1],
    })

    patchBuildingFollowingStateInCache({
      queryClient,
      buildingId: "building-1",
      isFollowing: true,
    })

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [{ data: { building: { isFollowing: true } } }],
    })
  })

  it("patches nested building on public and owner listing detail caches", () => {
    const queryClient = createQueryClient()
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const ownerKey = queryKeys.listings.ownerDetail("listing-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: buildingRow("building-1", false),
      },
    })
    queryClient.setQueryData(ownerKey, {
      listing: {
        _id: "listing-1",
        building: buildingRow("building-1", false),
      },
    })

    patchBuildingFollowingStateInCache({
      queryClient,
      buildingId: "building-1",
      isFollowing: true,
    })

    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
    expect(queryClient.getQueryData(ownerKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
  })
})

describe("applyDeletedBuildingFollowToCache", () => {
  it("clears follow rows and marks building copies unfollowed", () => {
    const queryClient = createQueryClient()
    const followsKey = queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 })
    const buildingKey = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(followsKey, {
      pages: [
        {
          data: {
            followings: [
              followRow("follow-1", "building-1"),
              followRow("follow-2", "building-2"),
            ],
          },
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(buildingKey, buildingRow("building-1", true))

    applyDeletedBuildingFollowToCache(queryClient, "building-1")

    expect(queryClient.getQueryData(followsKey)).toMatchObject({
      pages: [
        {
          data: { followings: [{ buildingId: "building-2" }] },
          pagination: { total: 1 },
        },
      ],
    })
    expect(queryClient.getQueryData(buildingKey)).toMatchObject({
      isFollowing: false,
    })
  })
})

describe("syncBuildingFollowingState", () => {
  it("invalidates followings on follow without refetching building detail", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const buildingKey = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(buildingKey, buildingRow("building-1", false))

    await syncBuildingFollowingState({
      queryClient,
      buildingId: "building-1",
      isFollowing: true,
    })

    expect(queryClient.getQueryData(buildingKey)).toMatchObject({
      isFollowing: true,
    })
    expect(invalidateSpy).toHaveBeenCalledOnce()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.buildingFollows.all,
    })
  })

  it("removes follow rows locally on unfollow without invalidating", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const followsKey = queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 })
    queryClient.setQueryData(followsKey, {
      pages: [
        {
          data: {
            followings: [followRow("follow-1", "building-1")],
          },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    await syncBuildingFollowingState({
      queryClient,
      buildingId: "building-1",
      isFollowing: false,
    })

    expect(queryClient.getQueryData(followsKey)).toMatchObject({
      pages: [{ data: { followings: [] }, pagination: { total: 0 } }],
    })
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
