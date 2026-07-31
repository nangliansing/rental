import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  createBuildingFollow: vi.fn(),
}))

vi.mock("./createBuildingFollow", () => ({
  createBuildingFollow: mocks.createBuildingFollow,
  isBuildingAlreadyFollowedError: (error: unknown) =>
    (error as { code?: string }).code === "BUILDING_ALREADY_FOLLOWED",
}))

import { useCreateBuildingFollow } from "./useCreateBuildingFollow"

const variables = { buildingId: "building-1" }

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const followsKey = queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 })
  const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
  const unrelatedKey = queryKeys.notifications.me
  const followsData = {
    pages: [{
      data: {
        followings: [{ _id: "follow-1", buildingId: "building-2" }],
      },
      pagination: { page: 1, limit: 20, total: 1 },
    }],
    pageParams: [1],
  }
  const publicData = {
    listing: {
      _id: "listing-1",
      building: { _id: "building-1", name: "Sample", isFollowing: false },
    },
  }

  queryClient.setQueryData(followsKey, followsData)
  queryClient.setQueryData(publicKey, publicData)
  queryClient.setQueryData(unrelatedKey, { unreadCount: 2 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useCreateBuildingFollow(), { wrapper: Wrapper }),
    followsData,
    followsKey,
    publicData,
    publicKey,
    queryClient,
    unrelatedKey,
  }
}

describe("useCreateBuildingFollow", () => {
  beforeEach(() => {
    mocks.createBuildingFollow.mockReset()
  })

  it("cancels in-flight reads, optimistically patches related caches, and invalidates followings on success", async () => {
    mocks.createBuildingFollow.mockResolvedValue({
      _id: "follow-2",
      userId: "user-1",
      buildingId: "building-1",
    })
    const { result, queryClient, publicKey, unrelatedKey } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(mocks.createBuildingFollow).toHaveBeenCalledOnce())

    expect(cancel).toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unreadCount: 2 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.buildingFollows.all,
        refetchType: "active",
      }),
    )
  })

  it("restores every captured snapshot after a genuine failure", async () => {
    mocks.createBuildingFollow.mockRejectedValue(new Error("Network error"))
    const {
      result,
      queryClient,
      publicKey,
      publicData,
      followsKey,
      followsData,
    } = setup()

    await expect(
      act(async () => result.current.mutateAsync(variables)),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(followsKey)).toEqual(followsData)
    expect(queryClient.getQueryData(publicKey)).toEqual(publicData)
  })

  it("treats an already-followed response as success", async () => {
    mocks.createBuildingFollow.mockRejectedValue(
      new ApiError("Already followed", 409, "BUILDING_ALREADY_FOLLOWED"),
    )
    const { result, queryClient, publicKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
  })

  it("forwards abort signals to the API client", async () => {
    mocks.createBuildingFollow.mockResolvedValue({
      _id: "follow-2",
      userId: "user-1",
      buildingId: "building-1",
    })
    const controller = new AbortController()
    const { result } = setup()

    act(() => result.current.mutate({ ...variables, signal: controller.signal }))
    await waitFor(() => expect(mocks.createBuildingFollow).toHaveBeenCalledOnce())
    expect(mocks.createBuildingFollow.mock.calls[0]?.[0]).toMatchObject({
      signal: controller.signal,
    })
  })

  it("does not call the endpoint when query cancellation fails", async () => {
    const { result, queryClient, publicData, publicKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.createBuildingFollow).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toEqual(publicData)
  })

  it("does not invalidate after a genuine failure", async () => {
    mocks.createBuildingFollow.mockRejectedValue(new Error("Network error"))
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await expect(
      act(async () => result.current.mutateAsync(variables)),
    ).rejects.toThrow("Network error")

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("reconciles cache entries recreated while follow is pending", async () => {
    let resolve!: (value: unknown) => void
    mocks.createBuildingFollow.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const {
      result,
      queryClient,
      publicKey,
      publicData,
    } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(mocks.createBuildingFollow).toHaveBeenCalledOnce())

    queryClient.setQueryData(publicKey, publicData)
    await act(async () =>
      resolve({
        _id: "follow-2",
        userId: "user-1",
        buildingId: "building-1",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
  })

  it("serializes follows that share the building-follow write scope", async () => {
    let resolveFirst!: (value: unknown) => void
    mocks.createBuildingFollow
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveFirst = done
          }),
      )
      .mockResolvedValueOnce({
        _id: "follow-3",
        userId: "user-1",
        buildingId: "building-2",
      })
    const { result } = setup()

    act(() => {
      result.current.mutate({ buildingId: "building-1" })
      result.current.mutate({ buildingId: "building-2" })
    })
    await waitFor(() =>
      expect(mocks.createBuildingFollow).toHaveBeenCalledTimes(1),
    )

    await act(async () =>
      resolveFirst({
        _id: "follow-2",
        userId: "user-1",
        buildingId: "building-1",
      }),
    )
    await waitFor(() =>
      expect(mocks.createBuildingFollow).toHaveBeenCalledTimes(2),
    )
  })
})
