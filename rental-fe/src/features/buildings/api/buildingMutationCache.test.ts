import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  cancelRelatedBuildingQueries,
  invalidateRelatedBuildingQueries,
  patchBuildingInRelatedQueries,
  relatedBuildingQueryKeys,
  type BuildingCachePatch,
} from "./buildingMutationCache"

function building(
  id: string,
  extra: Partial<BuildingCachePatch> = {},
): BuildingCachePatch {
  return {
    _id: id,
    name: "Test Building",
    buildingType: "CONDO",
    facilities: ["POOL"],
    security: ["CCTV"],
    location: { type: "Point", coordinates: [100.5, 13.7] },
    address: "123 Main St",
    minRent: 10_000,
    maxRent: 20_000,
    ...extra,
  }
}

describe("relatedBuildingQueryKeys", () => {
  it("includes every cache family that can hold a building projection", () => {
    const keys = relatedBuildingQueryKeys("building-1")

    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.buildings.detail("building-1"),
        queryKeys.mapSearch.buildings,
        queryKeys.mapSearch.listingsInBuilding,
        queryKeys.listings.ownerLists,
        queryKeys.listings.ownerDetails,
        queryKeys.listings.publicDetails,
        queryKeys.agentListings.lists,
        queryKeys.savedListings.all,
      ]),
    )
  })
})

describe("patchBuildingInRelatedQueries", () => {
  it("patches recognizable building records across every related family", () => {
    const queryClient = new QueryClient()
    const patch = building("building-1", {
      name: "Updated Building",
      address: "New address",
    })
    const keys = relatedBuildingQueryKeys("building-1")

    keys.forEach((queryKey, index) => {
      queryClient.setQueryData(queryKey, {
        index,
        building: {
          _id: "building-1",
          name: "Old Building",
          buildingType: "APARTMENT",
          location: { type: "Point", coordinates: [1, 2] },
        },
        listing: { _id: "building-1", rent: 12_000 },
      })
    })

    patchBuildingInRelatedQueries(queryClient, patch)

    keys.forEach((queryKey) => {
      expect(queryClient.getQueryData(queryKey)).toMatchObject({
        building: {
          name: "Updated Building",
          address: "New address",
          buildingType: "CONDO",
        },
        listing: { _id: "building-1", rent: 12_000 },
      })
    })
  })

  it("patches nested buildings inside map search and listing payloads", () => {
    const queryClient = new QueryClient()
    const mapKey = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(mapKey, {
      data: [
        {
          _id: "building-1",
          name: "Old",
          buildingType: "CONDO",
          location: { type: "Point", coordinates: [1, 2] },
          listings: [{ _id: "listing-1", rent: 9000 }],
        },
      ],
      pagination: { total: 1 },
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(mapKey)).toMatchObject({
      data: [
        {
          name: "Updated",
          listings: [{ _id: "listing-1", rent: 9000 }],
        },
      ],
    })
  })

  it("patches every occurrence when the same building appears multiple times", () => {
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
            building: {
              _id: "building-1",
              name: "Old",
              buildingType: "CONDO",
              location: { type: "Point", coordinates: [1, 2] },
            },
            relatedBuildings: [
              {
                _id: "building-1",
                name: "Old",
                buildingType: "CONDO",
                location: { type: "Point", coordinates: [1, 2] },
              },
            ],
          },
        },
      ],
      pageParams: [1],
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [
        {
          data: {
            building: { name: "Updated" },
            relatedBuildings: [{ name: "Updated" }],
          },
        },
      ],
    })
  })

  it("does not patch records that share an id but lack building shape", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.listings.publicDetail("listing-1", "user-1")
    const current = { _id: "building-1", rent: 12_000 }
    queryClient.setQueryData(key, current)

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("does not patch caches outside the related building families", () => {
    const queryClient = new QueryClient()
    const key = ["reviews", "building-1"] as const
    const current = {
      _id: "building-1",
      buildingType: "CONDO",
      rating: 5,
    }
    queryClient.setQueryData(key, current)

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("preserves untouched sibling references", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const keep = {
      _id: "building-2",
      name: "Keep",
      buildingType: "CONDO",
      location: { type: "Point", coordinates: [2, 3] },
    }
    const current = {
      data: [
        {
          _id: "building-1",
          name: "Old",
          buildingType: "CONDO",
          location: { type: "Point", coordinates: [1, 2] },
        },
        keep,
      ],
    }
    queryClient.setQueryData(key, current)

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    const next = queryClient.getQueryData(key) as { data: unknown[] }
    expect(next.data[1]).toBe(keep)
    expect(next.data[0]).toMatchObject({ name: "Updated" })
  })

  it("matches buildings identified by location even without buildingType", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(key, {
      _id: "building-1",
      name: "Old",
      location: { type: "Point", coordinates: [1, 2] },
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated", buildingType: "CONDO" }),
    )

    expect(queryClient.getQueryData(key)).toMatchObject({
      name: "Updated",
      buildingType: "CONDO",
    })
  })

  it("dedupes overlapping prefixes to one write per cached query", () => {
    const queryClient = new QueryClient()
    const mapKey = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(mapKey, {
      data: [
        {
          _id: "building-1",
          name: "Old",
          buildingType: "CONDO",
          location: { type: "Point", coordinates: [1, 2] },
        },
      ],
    })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(mapKey)).toMatchObject({
      data: [{ name: "Updated" }],
    })
  })

  it("handles undefined cached queries without throwing", () => {
    const queryClient = new QueryClient()

    expect(() =>
      patchBuildingInRelatedQueries(
        queryClient,
        building("building-1", { name: "Updated" }),
      ),
    ).not.toThrow()
  })

  it("merges every field from the canonical building patch", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(key, {
      _id: "building-1",
      name: "Old",
      buildingType: "APARTMENT",
      facilities: [],
      security: [],
      location: { type: "Point", coordinates: [0, 0] },
      address: "Old address",
      minRent: 1,
      maxRent: 2,
      extraField: "keep-me",
    })

    const patch = building("building-1", {
      name: "Updated",
      buildingType: "CONDO",
      facilities: ["POOL", "GYM"],
      security: ["GUARD"],
      location: { type: "Point", coordinates: [100.5, 13.7] },
      address: "New address",
      minRent: 10_000,
      maxRent: 20_000,
    })

    patchBuildingInRelatedQueries(queryClient, patch)

    expect(queryClient.getQueryData(key)).toEqual({
      ...patch,
      extraField: "keep-me",
    })
  })

  it("patches buildings embedded inside saved-list rows without removing the row", () => {
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
                listing: {
                  _id: "listing-1",
                  rent: 9000,
                  building: {
                    _id: "building-1",
                    name: "Old",
                    buildingType: "CONDO",
                    location: { type: "Point", coordinates: [1, 2] },
                  },
                },
              },
            ],
          },
        },
      ],
      pageParams: [1],
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [
        {
          data: {
            savedListings: [
              {
                _id: "saved-1",
                listing: {
                  building: { name: "Updated" },
                },
              },
            ],
          },
        },
      ],
    })
  })

  it("patches owner, agent, and listing detail caches independently", () => {
    const queryClient = new QueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const agentKey = queryKeys.agentListings.list({
      agentProfileId: "agent-1",
      filter: "all",
      sort: "latest",
      limit: 20,
    })
    const ownerListKey = queryKeys.listings.ownerList({
      filter: "all",
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(ownerDetailKey, {
      _id: "listing-1",
      rent: 9000,
      building: {
        _id: "building-1",
        name: "Old",
        buildingType: "CONDO",
        location: { type: "Point", coordinates: [1, 2] },
      },
    })
    queryClient.setQueryData(agentKey, {
      listings: [
        {
          _id: "listing-2",
          building: {
            _id: "building-1",
            name: "Old",
            buildingType: "CONDO",
            location: { type: "Point", coordinates: [1, 2] },
          },
        },
      ],
    })
    queryClient.setQueryData(ownerListKey, {
      data: [
        {
          _id: "listing-3",
          buildingId: "building-1",
          building: {
            _id: "building-1",
            name: "Old",
            buildingType: "CONDO",
            location: { type: "Point", coordinates: [1, 2] },
          },
        },
      ],
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(ownerDetailKey)).toMatchObject({
      building: { name: "Updated" },
    })
    expect(queryClient.getQueryData(agentKey)).toMatchObject({
      listings: [{ building: { name: "Updated" } }],
    })
    expect(queryClient.getQueryData(ownerListKey)).toMatchObject({
      data: [{ building: { name: "Updated" } }],
    })
  })

  it("patches buildings across every map-search result variant", () => {
    const queryClient = new QueryClient()
    const keys = [
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

    keys.forEach((key) => {
      queryClient.setQueryData(key, {
        data: [
          {
            _id: "building-1",
            name: "Old",
            buildingType: "CONDO",
            location: { type: "Point", coordinates: [1, 2] },
          },
        ],
      })
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    keys.forEach((key) => {
      expect(queryClient.getQueryData(key)).toMatchObject({
        data: [{ name: "Updated" }],
      })
    })
  })

  it("patches buildings inside infinite-list pages without changing pagination", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 1,
    })
    queryClient.setQueryData(key, {
      pageParams: [1, 2],
      pages: [
        {
          data: [
            {
              _id: "building-1",
              name: "Old",
              buildingType: "CONDO",
              location: { type: "Point", coordinates: [1, 2] },
            },
          ],
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          data: [
            {
              _id: "building-2",
              name: "Other",
              buildingType: "CONDO",
              location: { type: "Point", coordinates: [2, 3] },
            },
          ],
          pagination: { page: 2, limit: 1, total: 2 },
        },
      ],
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(key)).toMatchObject({
      pages: [
        { data: [{ name: "Updated" }], pagination: { total: 2 } },
        { data: [{ name: "Other" }], pagination: { total: 2 } },
      ],
    })
  })

  it("matches buildings identified by buildingType even without location", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(key, {
      _id: "building-1",
      name: "Old",
      buildingType: "APARTMENT",
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", {
        name: "Updated",
        location: { type: "Point", coordinates: [100.5, 13.7] },
      }),
    )

    expect(queryClient.getQueryData(key)).toMatchObject({
      name: "Updated",
      buildingType: "CONDO",
      location: { type: "Point", coordinates: [100.5, 13.7] },
    })
  })

  it("is a no-op when the building id is absent from the cache", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const current = {
      data: [
        {
          _id: "building-2",
          name: "Other",
          buildingType: "CONDO",
          location: { type: "Point", coordinates: [2, 3] },
        },
      ],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(key, current)

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(key)).toEqual(current)
  })

  it("patches shared building references at every occurrence", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.buildings.detail("building-1")
    const shared = {
      _id: "building-1",
      name: "Old",
      buildingType: "CONDO",
      location: { type: "Point", coordinates: [1, 2] },
    }
    queryClient.setQueryData(key, {
      primary: shared,
      related: [shared],
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    const next = queryClient.getQueryData(key) as {
      primary: { name: string }
      related: Array<{ name: string }>
    }
    expect(next.primary.name).toBe("Updated")
    expect(next.related[0]?.name).toBe("Updated")
    expect(shared.name).toBe("Old")
  })

  it("allows null address in the canonical patch", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.buildings.detail("building-1")
    queryClient.setQueryData(key, {
      _id: "building-1",
      name: "Old",
      buildingType: "CONDO",
      location: { type: "Point", coordinates: [1, 2] },
      address: "Old address",
    })

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { address: null }),
    )

    expect(queryClient.getQueryData(key)).toMatchObject({
      address: null,
    })
  })

  it("handles empty infinite-list caches without throwing", () => {
    const queryClient = new QueryClient()
    const key = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const current = { pages: [], pageParams: [] }
    queryClient.setQueryData(key, current)

    expect(() =>
      patchBuildingInRelatedQueries(
        queryClient,
        building("building-1", { name: "Updated" }),
      ),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toEqual(current)
  })

  it("does not patch unrelated caches even when they contain building-shaped records", () => {
    const queryClient = new QueryClient()
    const unrelatedKey = queryKeys.notifications.me
    const current = {
      _id: "building-1",
      name: "Notification payload",
      buildingType: "CONDO",
      location: { type: "Point", coordinates: [1, 2] },
    }
    queryClient.setQueryData(unrelatedKey, current)

    patchBuildingInRelatedQueries(
      queryClient,
      building("building-1", { name: "Updated" }),
    )

    expect(queryClient.getQueryData(unrelatedKey)).toBe(current)
  })
})

describe("cancelRelatedBuildingQueries", () => {
  it("resolves without throwing when no queries are in flight", async () => {
    const queryClient = new QueryClient()

    await expect(
      cancelRelatedBuildingQueries(queryClient, "building-1"),
    ).resolves.toBeUndefined()
  })

  it("resolves when related caches are populated but idle", async () => {
    const queryClient = new QueryClient()
    relatedBuildingQueryKeys("building-1").forEach((key) => {
      queryClient.setQueryData(key, {
        building: {
          _id: "building-1",
          name: "Old",
          buildingType: "CONDO",
          location: { type: "Point", coordinates: [1, 2] },
        },
      })
    })

    await expect(
      cancelRelatedBuildingQueries(queryClient, "building-1"),
    ).resolves.toBeUndefined()
  })
})

describe("invalidateRelatedBuildingQueries", () => {
  it("invalidates every related building family with active refetch", async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await invalidateRelatedBuildingQueries(queryClient, "building-1")

    expect(invalidateSpy).toHaveBeenCalledTimes(
      relatedBuildingQueryKeys("building-1").length,
    )
    relatedBuildingQueryKeys("building-1").forEach((queryKey) => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey,
        refetchType: "active",
      })
    })
  })

  it("does not invalidate unrelated caches", async () => {
    const queryClient = new QueryClient()
    const unrelatedKey = queryKeys.notifications.me
    queryClient.setQueryData(unrelatedKey, { unreadCount: 2 })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await invalidateRelatedBuildingQueries(queryClient, "building-1")

    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: unrelatedKey,
      refetchType: "active",
    })
  })
})
