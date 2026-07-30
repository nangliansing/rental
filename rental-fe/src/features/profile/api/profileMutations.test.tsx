import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  deletedProfileQueryKeys,
  profileProjectionQueryKeys,
  removeDeletedProfileQueries,
} from "./profileMutationCache"
import { useCreateAgentProfile } from "./useCreateAgentProfile"
import { useDeleteMyAgentProfile } from "./useDeleteMyAgentProfile"
import { useUpdateMyAgentProfile } from "./useUpdateMyAgentProfile"

const apiMocks = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}))

vi.mock("./createAgentProfile", () => ({ createAgentProfile: apiMocks.create }))
vi.mock("./deleteMyAgentProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deleteMyAgentProfile")>()
  return {
    ...actual,
    deleteMyAgentProfile: apiMocks.delete,
  }
})
vi.mock("./updateMyAgentProfile", () => ({ updateMyAgentProfile: apiMocks.update }))

const profile = { _id: "profile-1", userId: "user-1", displayName: "Nang Rentals" }
const createValues = {
  displayName: "Nang Rentals",
  profilePhoto: null,
  description: "",
  phone: "+66812345678",
  lineUrl: "",
  whatsappPhone: "",
  telegramUrl: "",
  viberPhone: "",
  supportLanguages: ["English"],
}

describe("profile mutations", () => {
  let queryClient: QueryClient
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    apiMocks.create.mockReset().mockResolvedValue(profile)
    apiMocks.delete.mockReset().mockResolvedValue({
      ...profile,
      isDeleted: true,
      isOnline: false,
      isVerified: false,
    })
    apiMocks.update.mockReset().mockResolvedValue(profile)
  })

  it("cancels the owner query and hydrates both canonical profile caches", async () => {
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const { result } = renderHook(() => useCreateAgentProfile(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(createValues)
    })

    expect(cancel).toHaveBeenCalledWith({ queryKey: queryKeys.profiles.me })
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profile._id)),
    ).toEqual(profile)
  })

  it("preserves the previous profile caches when creation fails", async () => {
    const previousProfile = { ...profile, displayName: "Previous profile" }
    queryClient.setQueryData(queryKeys.profiles.me, previousProfile)
    queryClient.setQueryData(
      queryKeys.profiles.detail(profile._id),
      previousProfile,
    )
    apiMocks.create.mockRejectedValue(new Error("Network error"))
    const { result } = renderHook(() => useCreateAgentProfile(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync(createValues)),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(
      previousProfile,
    )
    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profile._id)),
    ).toEqual(previousProfile)
  })

  it("serializes repeated profile creation requests", async () => {
    let resolveFirst!: (value: typeof profile) => void
    apiMocks.create
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve
      }))
      .mockResolvedValueOnce(profile)
    const { result } = renderHook(() => useCreateAgentProfile(), { wrapper })

    act(() => {
      result.current.mutate(createValues)
      result.current.mutate(createValues)
    })

    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledTimes(1))
    resolveFirst(profile)
    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledTimes(2))
  })

  it("optimistically updates all profile projections and reconciles success", async () => {
    let resolveUpdate!: (value: typeof profile) => void
    apiMocks.update.mockImplementation(
      () => new Promise((resolve) => {
        resolveUpdate = resolve
      }),
    )
    const previousProfile = {
      ...profile,
      displayName: "Old",
      isActive: true,
    }
    const ownerListKey = queryKeys.listings.ownerList({
      filter: "all",
      sort: "latest",
      limit: 20,
    })
    const agentListKey = queryKeys.agentListings.list({
      agentProfileId: profile._id,
      sort: "latest",
      limit: 20,
    })
    queryClient.setQueryData(queryKeys.profiles.me, previousProfile)
    queryClient.setQueryData(
      queryKeys.profiles.detail(profile._id),
      previousProfile,
    )
    queryClient.setQueryData(ownerListKey, {
      pages: [{ data: { agentProfile: previousProfile, listings: [] } }],
    })
    queryClient.setQueryData(agentListKey, {
      pages: [{ data: { agentProfile: previousProfile, listings: [] } }],
    })
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const { result } = renderHook(() => useUpdateMyAgentProfile(), { wrapper })

    act(() => {
      result.current.mutate({ displayName: "Optimistic" })
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ displayName: string }>(queryKeys.profiles.me)
          ?.displayName,
      ).toBe("Optimistic"),
    )
    expect(cancel).toHaveBeenCalledTimes(profileProjectionQueryKeys.length)
    expect(
      queryClient.getQueryData<{
        pages: Array<{ data: { agentProfile: { displayName: string } } }>
      }>(ownerListKey)?.pages[0].data.agentProfile.displayName,
    ).toBe("Optimistic")
    expect(
      queryClient.getQueryData<{
        pages: Array<{ data: { agentProfile: { displayName: string } } }>
      }>(agentListKey)?.pages[0].data.agentProfile.displayName,
    ).toBe("Optimistic")

    await act(async () => resolveUpdate(profile))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
    expect(
      queryClient.getQueryData<{ displayName: string; isActive: boolean }>(
        queryKeys.profiles.detail(profile._id),
      ),
    ).toMatchObject({ displayName: "Nang Rentals", isActive: true })
  })

  it("restores exact profile projection snapshots on update failure", async () => {
    const previousProfile = { ...profile, displayName: "Old" }
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const savedData = {
      pages: [
        {
          data: {
            savedListings: [
              { listing: { agentProfile: previousProfile } },
            ],
          },
        },
      ],
    }
    queryClient.setQueryData(queryKeys.profiles.me, previousProfile)
    queryClient.setQueryData(savedKey, savedData)
    apiMocks.update.mockRejectedValue(new Error("Network error"))
    const { result } = renderHook(() => useUpdateMyAgentProfile(), { wrapper })

    await expect(
      act(async () =>
        result.current.mutateAsync({ displayName: "Optimistic" }),
      ),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(
      previousProfile,
    )
    expect(queryClient.getQueryData(savedKey)).toEqual(savedData)
  })

  it("optimistically marks deletion and removes inaccessible caches on success", async () => {
    let resolveDelete!: (value: typeof profile) => void
    apiMocks.delete.mockImplementation(
      () => new Promise((resolve) => {
        resolveDelete = resolve
      }),
    )
    const currentProfile = {
      ...profile,
      isDeleted: false,
      isOnline: true,
      isVerified: true,
    }
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const mapKey = queryKeys.mapSearch.listingsInBuildingResults({
      buildingId: "building-1",
      filters: {},
      limit: 20,
    })
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(publicKey, {
      listing: { _id: "listing-1", agentProfile: currentProfile },
    })
    queryClient.setQueryData(mapKey, { data: { listings: [] } })
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ isDeleted: boolean }>(queryKeys.profiles.me)
          ?.isDeleted,
      ).toBe(true),
    )
    expect(cancel).toHaveBeenCalledTimes(deletedProfileQueryKeys.length)

    await act(async () => resolveDelete(profile))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
    expect(queryClient.getQueryData(publicKey)).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.mapSearch.buildings,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.mapSearch.listingsInBuilding,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.savedListings.all,
      refetchType: "active",
    })
  })

  it("restores all deletion snapshots on failure", async () => {
    const currentProfile = { ...profile, isDeleted: false, isOnline: true }
    const pendingKey = queryKeys.pendingPosts.ownerList({
      status: "PENDING",
      limit: 20,
    })
    const pendingData = { pages: [{ data: [{ _id: "pending-1" }] }] }
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(pendingKey, pendingData)
    apiMocks.delete.mockRejectedValue(new Error("Network error"))
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync()),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(
      currentProfile,
    )
    expect(queryClient.getQueryData(pendingKey)).toEqual(pendingData)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("treats an already-missing profile as idempotent success", async () => {
    const currentProfile = { ...profile, isDeleted: false, isOnline: true }
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(
      queryKeys.profiles.detail(profile._id),
      currentProfile,
    )
    apiMocks.delete.mockRejectedValue(
      new ApiError("Missing", 404, "AGENT_PROFILE_NOT_FOUND"),
    )
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
    expect(
      queryClient.getQueryData(queryKeys.profiles.detail(profile._id)),
    ).toBeUndefined()
  })

  it("does not call the endpoint or mutate projections when cancellation fails", async () => {
    const currentProfile = { ...profile, isDeleted: false, isOnline: true }
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(apiMocks.delete).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(
      currentProfile,
    )
  })

  it("removes profile-dependent caches recreated while deletion is pending", async () => {
    let resolveDelete!: (value: typeof profile) => void
    apiMocks.delete.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )
    const currentProfile = { ...profile, isDeleted: false, isOnline: true }
    const publicKey = queryKeys.listings.publicDetail(
      "listing-1",
      "viewer-1",
    )
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(publicKey, {
      listing: { _id: "listing-1", agentProfile: currentProfile },
    })
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledTimes(1))

    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(publicKey, {
      listing: { _id: "listing-1", agentProfile: currentProfile },
    })
    await act(async () => resolveDelete(profile))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
    expect(queryClient.getQueryData(publicKey)).toBeUndefined()
  })

  it("succeeds after complete cache eviction without creating phantom entries", async () => {
    queryClient.clear()
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      queryClient.getQueryCache().find({
        queryKey: queryKeys.profiles.me,
        exact: true,
      }),
    ).toBeUndefined()
  })

  it("rejects a queued update after deletion instead of resurrecting the profile", async () => {
    let resolveDelete!: (value: typeof profile) => void
    apiMocks.delete.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )
    const { result } = renderHook(
      () => ({
        deleteProfile: useDeleteMyAgentProfile(),
        updateProfile: useUpdateMyAgentProfile(),
      }),
      { wrapper },
    )

    act(() => {
      result.current.deleteProfile.mutate()
      result.current.updateProfile.mutate({ displayName: "Too late" })
    })
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledTimes(1))
    expect(apiMocks.update).not.toHaveBeenCalled()

    await act(async () => resolveDelete(profile))
    await waitFor(() =>
      expect(result.current.updateProfile.isError).toBe(true),
    )
    expect(apiMocks.update).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
  })

  it("allows an explicitly queued profile recreation after deletion", async () => {
    let resolveDelete!: (value: typeof profile) => void
    apiMocks.delete.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )
    const { result } = renderHook(
      () => ({
        createProfile: useCreateAgentProfile(),
        deleteProfile: useDeleteMyAgentProfile(),
      }),
      { wrapper },
    )

    act(() => {
      result.current.deleteProfile.mutate()
      result.current.createProfile.mutate(createValues)
    })
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledTimes(1))
    expect(apiMocks.create).not.toHaveBeenCalled()

    await act(async () => resolveDelete(profile))
    await waitFor(() => expect(apiMocks.create).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.createProfile.isSuccess).toBe(true))
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
  })

  it("keeps admin projections marked deleted after owner caches are removed", async () => {
    const currentProfile = {
      ...profile,
      isDeleted: false,
      isOnline: true,
      isVerified: true,
    }
    const adminKey = queryKeys.admin.users.detail("user-1")
    queryClient.setQueryData(queryKeys.profiles.me, currentProfile)
    queryClient.setQueryData(adminKey, {
      _id: "user-1",
      agentProfile: currentProfile,
    })
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(adminKey)).toMatchObject({
      agentProfile: {
        isDeleted: true,
        isOnline: false,
        isVerified: false,
      },
    })
  })

  it("removes every remaining family when one cache removal throws", () => {
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

  it("keeps destructive cleanup successful when collection refresh fails", async () => {
    queryClient.setQueryData(queryKeys.profiles.me, profile)
    vi.spyOn(queryClient, "invalidateQueries").mockRejectedValue(
      new Error("Refresh failed"),
    )
    const { result } = renderHook(() => useDeleteMyAgentProfile(), { wrapper })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toBeUndefined()
  })
})
