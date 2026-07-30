import type { PropsWithChildren } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createBuildingFollow: vi.fn(),
  deleteBuildingFollow: vi.fn(),
  patchBuildingFollowingStateInCache: vi.fn(),
  syncBuildingFollowingState: vi.fn(),
}))

vi.mock("../api", () => ({
  createBuildingFollow: mocks.createBuildingFollow,
  deleteBuildingFollow: mocks.deleteBuildingFollow,
  isBuildingAlreadyFollowedError: () => false,
  isBuildingFollowNotFoundError: () => false,
}))

vi.mock("../utils/buildingFollowCache", () => ({
  patchBuildingFollowingStateInCache: mocks.patchBuildingFollowingStateInCache,
  BUILDING_FOLLOW_WRITE_SCOPE_ID: "building-follow-write",
  syncBuildingFollowingState: mocks.syncBuildingFollowingState,
}))

import { useOptimisticBuildingFollowToggle } from "./useOptimisticBuildingFollowToggle"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe("useOptimisticBuildingFollowToggle", () => {
  beforeEach(() => {
    mocks.createBuildingFollow.mockResolvedValue({})
    mocks.deleteBuildingFollow.mockResolvedValue({})
    mocks.syncBuildingFollowingState.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("updates immediately and sends the follow request without debounce", async () => {
    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper() },
    )

    await act(async () => {
      result.current.toggle()
      await Promise.resolve()
    })

    expect(result.current.isFollowing).toBe(true)
    expect(mocks.createBuildingFollow).toHaveBeenCalledOnce()
    expect(mocks.deleteBuildingFollow).not.toHaveBeenCalled()
  })

  it("ignores rapid toggles while a request is pending", async () => {
    let resolveCreate: (() => void) | undefined
    mocks.createBuildingFollow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper() },
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

  it("rolls back to the confirmed state after a genuine failure", async () => {
    mocks.createBuildingFollow.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(
      () =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing: false,
        }),
      { wrapper: createWrapper() },
    )

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isFollowing).toBe(true)

    await act(async () => Promise.resolve())

    expect(result.current.isFollowing).toBe(false)
    expect(mocks.patchBuildingFollowingStateInCache).toHaveBeenLastCalledWith(
      expect.objectContaining({
        buildingId: "building-1",
        isFollowing: false,
      }),
    )
  })

  it("syncs local state when initialIsFollowing changes after server refresh", () => {
    const { result, rerender } = renderHook(
      ({ initialIsFollowing }: { initialIsFollowing: boolean }) =>
        useOptimisticBuildingFollowToggle({
          buildingId: "building-1",
          initialIsFollowing,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { initialIsFollowing: false },
      },
    )

    expect(result.current.isFollowing).toBe(false)

    rerender({ initialIsFollowing: true })

    expect(result.current.isFollowing).toBe(true)
  })
})
