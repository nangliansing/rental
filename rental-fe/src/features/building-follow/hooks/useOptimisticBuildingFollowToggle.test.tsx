import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  createBuildingFollow: vi.fn(),
  deleteBuildingFollow: vi.fn(),
}))

vi.mock("../api/createBuildingFollow", () => ({
  createBuildingFollow: mocks.createBuildingFollow,
  isBuildingAlreadyFollowedError: () => false,
}))

vi.mock("../api/deleteBuildingFollow", () => ({
  deleteBuildingFollow: mocks.deleteBuildingFollow,
  isBuildingFollowNotFoundError: () => false,
}))

import { useOptimisticBuildingFollowToggle } from "./useOptimisticBuildingFollowToggle"

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useOptimisticBuildingFollowToggle", () => {
  beforeEach(() => {
    mocks.createBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    mocks.deleteBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("updates immediately and sends the unfollow request", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: { _id: "building-1", name: "Sample", isFollowing: true },
      },
    })

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: true,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isFollowing).toBe(false)
    expect(mocks.deleteBuildingFollow).toHaveBeenCalledOnce()
    expect(mocks.createBuildingFollow).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: false } },
    })
  })

  it("updates immediately and sends the follow request without debounce", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: { _id: "building-1", name: "Sample", isFollowing: false },
      },
    })

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isFollowing).toBe(true)
    expect(mocks.createBuildingFollow).toHaveBeenCalledOnce()
    expect(mocks.deleteBuildingFollow).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { building: { isFollowing: true } },
    })
  })

  it("ignores rapid toggles while a request is pending", async () => {
    let resolveCreate: (() => void) | undefined
    mocks.createBuildingFollow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isFollowing).toBe(true)
    expect(mocks.createBuildingFollow).toHaveBeenCalledOnce()

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isFollowing).toBe(true)
    expect(mocks.createBuildingFollow).toHaveBeenCalledOnce()

    await act(async () => {
      resolveCreate?.()
      await Promise.resolve()
    })
  })

  it("rolls back UI and cache after a genuine failure", async () => {
    mocks.createBuildingFollow.mockRejectedValue(new Error("Network error"))
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const publicData = {
      listing: {
        _id: "listing-1",
        building: { _id: "building-1", name: "Sample", isFollowing: false },
      },
    }
    queryClient.setQueryData(publicKey, publicData)

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isFollowing).toBe(true)

    await waitFor(() => expect(result.current.isFollowing).toBe(false))
    expect(queryClient.getQueryData(publicKey)).toEqual(publicData)
  })

  it("syncs local state when initialIsFollowing changes after server refresh", () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })

    const { result, rerender } = renderHook(
      ({ initialIsFollowing }: { initialIsFollowing: boolean }) =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing,
        }),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { initialIsFollowing: false },
      },
    )

    expect(result.current.isFollowing).toBe(false)

    rerender({ initialIsFollowing: true })

    expect(result.current.isFollowing).toBe(true)
  })

  it("syncs follow state across mounted controls when another view patches cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: { _id: "building-1", name: "Sample", isFollowing: false },
      },
    })

    const buildingDetail = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )
    const listingDetail = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      buildingDetail.result.current.toggle()
      await Promise.resolve()
    })

    expect(buildingDetail.result.current.isFollowing).toBe(true)
    expect(listingDetail.result.current.isFollowing).toBe(true)

    await act(async () => {
      listingDetail.result.current.toggle()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(listingDetail.result.current.isFollowing).toBe(false)
      expect(buildingDetail.result.current.isFollowing).toBe(false)
    })
  })

  it("emits settleSignal with success and error outcomes", async () => {
    mocks.createBuildingFollow.mockRejectedValueOnce(new Error("Network error"))

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.settleSignal).toBe(1)
      expect(result.current.lastOutcome).toBe("error")
    })

    mocks.createBuildingFollow.mockResolvedValueOnce({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.settleSignal).toBe(2)
      expect(result.current.lastOutcome).toBe("success")
    })
  })
})
