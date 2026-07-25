import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  deletedProfileQueryKeys,
  profileProjectionQueryKeys,
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
vi.mock("./deleteMyAgentProfile", () => ({
  deleteMyAgentProfile: apiMocks.delete,
}))
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
      visibility: "all",
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
})
