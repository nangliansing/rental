import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import { syncListingSavedState } from "./savedListingCache"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

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
        listing: {
          _id: "listing-1",
          rent: 12_000,
          isSavedByMe: false,
        },
      },
    })
    queryClient.setQueryData(buildingListingsKey, {
      pages: [
        {
          data: {
            listings: [
              {
                _id: "listing-1",
                rent: 12_000,
                isSavedByMe: false,
              },
            ],
          },
        },
      ],
    })

    await syncListingSavedState({
      queryClient,
      listingId: "listing-1",
      isSaved: true,
    })

    expect(
      queryClient.getQueryData(publicKey),
    ).toMatchObject({
      data: { listing: { isSavedByMe: true } },
    })
    expect(
      queryClient.getQueryData(buildingListingsKey),
    ).toMatchObject({
      pages: [
        { data: { listings: [{ isSavedByMe: true }] } },
      ],
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
              { _id: "saved-1", listingId: "listing-1" },
              { _id: "saved-2", listingId: "listing-2" },
            ],
          },
          pagination: { page: 1, limit: 20, total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(agentKey, {
      listings: [
        { _id: "listing-1", rent: 12_000, isSavedByMe: true },
      ],
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
    expect(
      queryClient.getQueryData(agentKey),
    ).toMatchObject({
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
            savedListings: [
              { _id: "saved-1", listingId: "listing-1" },
            ],
          },
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          data: {
            savedListings: [
              { _id: "saved-2", listingId: "listing-2" },
            ],
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
          data: {
            savedListings: [{ listingId: "listing-2" }],
          },
          pagination: { total: 1 },
        },
      ],
    })
  })
})
