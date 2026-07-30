import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  cacheMyAgentProfile,
  deletedProfileCollectionsToRefresh,
  profileProjectionQueryKeys,
  reconcileDeletedProfileQueries,
  removeDeletedProfileQueries,
  updateAgentProfileProjections,
} from "./profileMutationCache"

const profileId = "profile-1"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function agentProfile(
  extra: Record<string, unknown> = {},
) {
  return {
    _id: profileId,
    userId: "user-1",
    displayName: "Nang Rentals",
    ...extra,
  }
}

describe("profileProjectionQueryKeys", () => {
  it("includes every cache family that can embed agent profile projections", () => {
    expect(profileProjectionQueryKeys).toEqual(
      expect.arrayContaining([
        queryKeys.profiles.me,
        queryKeys.profiles.details,
        queryKeys.listings.ownerLists,
        queryKeys.listings.publicDetails,
        queryKeys.savedListings.all,
        queryKeys.admin.users.details,
      ]),
    )
  })
})

describe("updateAgentProfileProjections", () => {
  it("patches nested agentProfile projections across related families", () => {
    const queryClient = createQueryClient()
    const ownerListKey = queryKeys.listings.ownerList({
      visibility: "all",
      sort: "latest",
      limit: 20,
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const ownerData = {
      pages: [
        {
          data: {
            agentProfile: agentProfile({ displayName: "Old" }),
            listings: [],
          },
        },
      ],
    }
    const publicData = {
      listing: {
        _id: "listing-1",
        agentProfile: agentProfile({ displayName: "Old" }),
      },
    }
    queryClient.setQueryData(ownerListKey, ownerData)
    queryClient.setQueryData(publicKey, publicData)

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: "Updated",
    })

    expect(queryClient.getQueryData(ownerListKey)).toMatchObject({
      pages: [{ data: { agentProfile: { displayName: "Updated" } } }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { agentProfile: { displayName: "Updated" } },
    })
  })

  it("patches the canonical me and detail caches", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.profiles.me, agentProfile())
    queryClient.setQueryData(
      queryKeys.profiles.detail(profileId),
      agentProfile({ isActive: true }),
    )

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: "Updated",
    })

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toMatchObject({
      displayName: "Updated",
    })
    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profileId)),
    ).toMatchObject({
      displayName: "Updated",
      isActive: true,
    })
  })

  it("preserves sibling references when only one nested projection changes", () => {
    const queryClient = createQueryClient()
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const keepListing = { _id: "listing-2", rent: 12_000 }
    const savedData = {
      pages: [
        {
          data: {
            savedListings: [
              { listing: { agentProfile: agentProfile(), _id: "listing-1" } },
              { listing: keepListing },
            ],
          },
        },
      ],
    }
    queryClient.setQueryData(savedKey, savedData)

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: "Updated",
    })

    const result = queryClient.getQueryData<{
      pages: Array<{ data: { savedListings: Array<{ listing: unknown }> } }>
    }>(savedKey)
    expect(result?.pages[0].data.savedListings[1].listing).toBe(keepListing)
  })

  it("does not patch unrelated records that only share the same _id", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.ownerDetail("listing-1")
    const unrelated = { _id: profileId, rent: 12_000 }
    queryClient.setQueryData(key, unrelated)

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: "Updated",
    })

    expect(queryClient.getQueryData(key)).toEqual(unrelated)
  })

  it("ignores undefined change entries", () => {
    const queryClient = createQueryClient()
    const current = agentProfile({ displayName: "Keep me" })
    queryClient.setQueryData(queryKeys.profiles.me, current)

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: undefined,
    })

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(current)
  })

  it("is a no-op when every change entry is undefined", () => {
    const queryClient = createQueryClient()
    const setQueriesData = vi.spyOn(queryClient, "setQueriesData")
    queryClient.setQueryData(queryKeys.profiles.me, agentProfile())

    updateAgentProfileProjections(queryClient, profileId, {
      displayName: undefined,
      description: undefined,
    })

    expect(setQueriesData).not.toHaveBeenCalled()
  })

  it("respects a custom query-key scope", () => {
    const queryClient = createQueryClient()
    const scopedKey = queryKeys.profiles.me
    const untouchedKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(scopedKey, agentProfile())
    queryClient.setQueryData(untouchedKey, {
      listing: { agentProfile: agentProfile({ displayName: "Old" }) },
    })

    updateAgentProfileProjections(
      queryClient,
      profileId,
      { displayName: "Updated" },
      [scopedKey],
    )

    expect(queryClient.getQueryData(scopedKey)).toMatchObject({
      displayName: "Updated",
    })
    expect(queryClient.getQueryData(untouchedKey)).toMatchObject({
      listing: { agentProfile: { displayName: "Old" } },
    })
  })

  it("leaves malformed cache values untouched instead of throwing", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.profiles.me
    const malformed = { pages: [{ data: null }] }
    queryClient.setQueryData(key, malformed)

    expect(() =>
      updateAgentProfileProjections(queryClient, profileId, {
        displayName: "Updated",
      }),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(malformed)
  })

  it("leaves cache values unchanged when nested access throws", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.listings.publicDetail("listing-1", "user-1")
    const throwing = {
      get listing() {
        throw new Error("listing failed")
      },
    }
    queryClient.setQueryData(key, throwing)

    expect(() =>
      updateAgentProfileProjections(queryClient, profileId, {
        displayName: "Updated",
      }),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(throwing)
  })

  it("marks deletion flags across admin projections without removing them", () => {
    const queryClient = createQueryClient()
    const adminKey = queryKeys.admin.users.detail("user-1")
    queryClient.setQueryData(adminKey, {
      _id: "user-1",
      agentProfile: agentProfile({
        isDeleted: false,
        isOnline: true,
        isVerified: true,
      }),
    })

    updateAgentProfileProjections(queryClient, profileId, {
      isDeleted: true,
      isOnline: false,
      isVerified: false,
    })

    expect(queryClient.getQueryData(adminKey)).toMatchObject({
      agentProfile: {
        isDeleted: true,
        isOnline: false,
        isVerified: false,
      },
    })
  })
})

describe("cacheMyAgentProfile", () => {
  it("hydrates both canonical profile caches", () => {
    const queryClient = createQueryClient()
    const profile = agentProfile({ description: "Bio" }) as never

    cacheMyAgentProfile(queryClient, profile)

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profileId)),
    ).toEqual(profile)
  })

  it("merges into an existing detail cache instead of replacing unrelated fields", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(
      queryKeys.profiles.detail(profileId),
      agentProfile({ isActive: true, displayName: "Old" }),
    )
    const profile = agentProfile({ displayName: "New" }) as never

    cacheMyAgentProfile(queryClient, profile)

    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profileId)),
    ).toMatchObject({
      displayName: "New",
      isActive: true,
    })
  })
})

describe("removeDeletedProfileQueries", () => {
  it("removes every deleted-profile cache family", () => {
    const queryClient = createQueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const pendingKey = queryKeys.pendingPosts.ownerList({
      status: "PENDING",
      limit: 20,
    })
    queryClient.setQueryData(queryKeys.profiles.me, agentProfile())
    queryClient.setQueryData(ownerDetailKey, { listing: { _id: "listing-1" } })
    queryClient.setQueryData(pendingKey, { pages: [] })

    removeDeletedProfileQueries(queryClient)

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(pendingKey)).toBeUndefined()
  })

  it("keeps admin projections that were marked deleted during optimism", () => {
    const queryClient = createQueryClient()
    const adminKey = queryKeys.admin.users.detail("user-1")
    queryClient.setQueryData(adminKey, {
      _id: "user-1",
      agentProfile: agentProfile({ isDeleted: true }),
    })

    removeDeletedProfileQueries(queryClient)

    expect(queryClient.getQueryData(adminKey)).toMatchObject({
      agentProfile: { isDeleted: true },
    })
  })

  it("attempts every removal even when one family throws", () => {
    const queryClient = createQueryClient()
    const ownerDetailKey = queryKeys.listings.ownerDetail("listing-1")
    const pendingKey = queryKeys.pendingPosts.ownerList({
      status: "PENDING",
      limit: 20,
    })
    queryClient.setQueryData(ownerDetailKey, { listing: { _id: "listing-1" } })
    queryClient.setQueryData(pendingKey, { pages: [] })
    const originalRemove = queryClient.removeQueries.bind(queryClient)
    vi.spyOn(queryClient, "removeQueries")
      .mockImplementationOnce(() => {
        throw new Error("First removal failed")
      })
      .mockImplementation((filters) => originalRemove(filters))

    expect(() => removeDeletedProfileQueries(queryClient)).toThrow(
      "Unable to remove every deleted-profile cache family",
    )
    expect(queryClient.getQueryData(ownerDetailKey)).toBeUndefined()
    expect(queryClient.getQueryData(pendingKey)).toBeUndefined()
  })
})

describe("reconcileDeletedProfileQueries", () => {
  it("removes owner caches and refreshes collection families", async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(queryKeys.profiles.me, agentProfile())
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await reconcileDeletedProfileQueries(queryClient)

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
    for (const queryKey of deletedProfileCollectionsToRefresh) {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey,
        refetchType: "active",
      })
    }
  })
})
