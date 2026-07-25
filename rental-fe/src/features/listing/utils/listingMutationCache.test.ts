import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  captureRelatedListingQueries,
  optimisticallyDeleteListing,
  patchListingInRelatedQueries,
  restoreListingCacheSnapshot,
} from "./listingMutationCache"

describe("listing mutation cache", () => {
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
        nested: { listing: { _id: "listing-1", rent: 10_000 } },
      })
    })

    patchListingInRelatedQueries(queryClient, "listing-1", { rent: 12_000 })

    relatedKeys.forEach((queryKey) => {
      expect(queryClient.getQueryData(queryKey)).toEqual({
        nested: { listing: { _id: "listing-1", rent: 12_000 } },
      })
    })
  })

  it("restores all captured variants after an optimistic failure", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "public", "latest", 20] as const
    const unrelatedKey = ["notifications"] as const
    queryClient.setQueryData(ownerKey, {
      listing: { _id: "listing-1", visibility: "PUBLIC" },
    })
    queryClient.setQueryData(unrelatedKey, { unread: 2 })

    const snapshot = captureRelatedListingQueries(queryClient, "listing-1")
    patchListingInRelatedQueries(queryClient, "listing-1", {
      visibility: "PRIVATE",
    })
    restoreListingCacheSnapshot(queryClient, snapshot)

    expect(queryClient.getQueryData(ownerKey)).toEqual({
      listing: { _id: "listing-1", visibility: "PUBLIC" },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unread: 2 })
  })

  it("removes collection listings but preserves saved snapshots", () => {
    const queryClient = new QueryClient()
    const ownerKey = ["owner-listings", "all"] as const
    const savedKey = ["saved-listings", 20] as const
    queryClient.setQueryData(ownerKey, {
      listings: [
        { _id: "listing-1", rent: 10_000 },
        { _id: "listing-2", rent: 12_000 },
      ],
    })
    queryClient.setQueryData(savedKey, {
      savedListings: [
        {
          _id: "saved-1",
          listingId: "listing-1",
          listing: { _id: "listing-1", rent: 10_000 },
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
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
          ],
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
    })
    buildingSearchKeys.forEach((queryKey) => {
      queryClient.setQueryData(queryKey, {
        data: [
          {
            _id: "building-1",
            listings: [{ _id: "listing-1" }],
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
})
