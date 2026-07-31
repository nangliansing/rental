import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  deleteBuildingFollow: vi.fn(),
}))

vi.mock("./deleteBuildingFollow", () => ({
  deleteBuildingFollow: mocks.deleteBuildingFollow,
  isBuildingFollowNotFoundError: (error: unknown) =>
    (error as { code?: string }).code === "BUILDING_FOLLOW_NOT_FOUND",
}))

import { useDeleteBuildingFollow } from "./useDeleteBuildingFollow"

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
        followings: [
          { _id: "follow-1", buildingId: "building-1" },
          { _id: "follow-2", buildingId: "building-2" },
        ],
      },
      pagination: { page: 1, limit: 20, total: 2 },
    }],
    pageParams: [1],
  }
  const publicData = {
    listing: {
      _id: "listing-1",
      building: { _id: "building-1", name: "Sample", isFollowing: true },
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
    ...renderHook(() => useDeleteBuildingFollow(), { wrapper: Wrapper }),
    followsData,
    followsKey,
    publicData,
    publicKey,
    queryClient,
    unrelatedKey,
  }
}

describe("useDeleteBuildingFollow", () => {
  beforeEach(() => {
    mocks.deleteBuildingFollow.mockReset()
  })

  it("cancels in-flight reads and optimistically reconciles related caches", async () => {
    mocks.deleteBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    const { result, queryClient, followsKey, publicKey, unrelatedKey } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(mocks.deleteBuildingFollow).toHaveBeenCalledOnce())

    expect(cancel).toHaveBeenCalled()
    expect(queryClient.getQueryData(followsKey)).toMatchObject({
      pages: [{
        data: { followings: [{ buildingId: "building-2" }] },
        pagination: { total: 1 },
      }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: false } },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unreadCount: 2 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every captured snapshot after a genuine failure", async () => {
    mocks.deleteBuildingFollow.mockRejectedValue(new Error("Network error"))
    const {
      result,
      queryClient,
      followsKey,
      followsData,
      publicKey,
      publicData,
    } = setup()

    await expect(
      act(async () => result.current.mutateAsync(variables)),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(followsKey)).toEqual(followsData)
    expect(queryClient.getQueryData(publicKey)).toEqual(publicData)
  })

  it("treats an already-unfollowed response as success", async () => {
    mocks.deleteBuildingFollow.mockRejectedValue(
      new ApiError("Not found", 404, "BUILDING_FOLLOW_NOT_FOUND"),
    )
    const { result, queryClient, followsKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(followsKey)).toMatchObject({
      pages: [{ data: { followings: [{ buildingId: "building-2" }] } }],
    })
  })

  it("does not invalidate safely reconciled query families", async () => {
    mocks.deleteBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("forwards abort signals to the API client", async () => {
    mocks.deleteBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    const controller = new AbortController()
    const { result } = setup()

    act(() => result.current.mutate({ ...variables, signal: controller.signal }))
    await waitFor(() => expect(mocks.deleteBuildingFollow).toHaveBeenCalledOnce())
    expect(mocks.deleteBuildingFollow.mock.calls[0]?.[0]).toMatchObject({
      signal: controller.signal,
    })
  })

  it("does not call the endpoint when query cancellation fails", async () => {
    const { result, queryClient, followsData, followsKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteBuildingFollow).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(followsKey)).toEqual(followsData)
  })

  it("reconciles cache entries recreated while unfollow is pending", async () => {
    let resolve!: (value: unknown) => void
    mocks.deleteBuildingFollow.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const {
      result,
      queryClient,
      followsKey,
      followsData,
      publicKey,
      publicData,
    } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(mocks.deleteBuildingFollow).toHaveBeenCalledOnce())

    queryClient.setQueryData(followsKey, followsData)
    queryClient.setQueryData(publicKey, publicData)
    await act(async () =>
      resolve({
        _id: "follow-1",
        userId: "user-1",
        buildingId: "building-1",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(followsKey)).toMatchObject({
      pages: [{
        data: { followings: [{ buildingId: "building-2" }] },
        pagination: { total: 1 },
      }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: false } },
    })
  })

  it("serializes unfollows that share the building-follow write scope", async () => {
    let resolveFirst!: (value: unknown) => void
    mocks.deleteBuildingFollow
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveFirst = done
          }),
      )
      .mockResolvedValueOnce({
        _id: "follow-2",
        userId: "user-1",
        buildingId: "building-2",
      })
    const { result } = setup()

    act(() => {
      result.current.mutate({ buildingId: "building-1" })
      result.current.mutate({ buildingId: "building-2" })
    })
    await waitFor(() =>
      expect(mocks.deleteBuildingFollow).toHaveBeenCalledTimes(1),
    )

    await act(async () =>
      resolveFirst({
        _id: "follow-1",
        userId: "user-1",
        buildingId: "building-1",
      }),
    )
    await waitFor(() =>
      expect(mocks.deleteBuildingFollow).toHaveBeenCalledTimes(2),
    )
  })
})
