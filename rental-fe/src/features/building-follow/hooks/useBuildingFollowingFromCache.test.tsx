import type { PropsWithChildren } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import { patchBuildingFollowingStateInCache } from "../utils/buildingFollowCache"
import { useBuildingFollowingFromCache } from "./useBuildingFollowingFromCache"

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useBuildingFollowingFromCache", () => {
  it("returns the fallback when the cache has no building copy yet", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useBuildingFollowingFromCache({
          buildingId: "building-1",
          fallbackIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    expect(result.current).toBe(false)
  })

  it("returns the fallback when disabled", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: {
          _id: "building-1",
          name: "Sample",
          buildingType: "Apartment",
          isFollowing: true,
        },
      },
    })

    const { result } = renderHook(
      () =>
        useBuildingFollowingFromCache({
          buildingId: "building-1",
          fallbackIsFollowing: false,
          enabled: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    expect(result.current).toBe(false)
  })

  it("re-renders when a related cache entry is patched", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    queryClient.setQueryData(publicKey, {
      listing: {
        _id: "listing-1",
        building: {
          _id: "building-1",
          name: "Sample",
          buildingType: "Apartment",
          isFollowing: false,
        },
      },
    })

    const { result } = renderHook(
      () =>
        useBuildingFollowingFromCache({
          buildingId: "building-1",
          fallbackIsFollowing: false,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    expect(result.current).toBe(false)

    act(() => {
      patchBuildingFollowingStateInCache({
        queryClient,
        buildingId: "building-1",
        isFollowing: true,
      })
    })

    expect(result.current).toBe(true)
  })

  it("updates when fallback changes before cache data exists", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result, rerender } = renderHook(
      ({ fallbackIsFollowing }: { fallbackIsFollowing: boolean }) =>
        useBuildingFollowingFromCache({
          buildingId: "building-1",
          fallbackIsFollowing,
        }),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { fallbackIsFollowing: false },
      },
    )

    expect(result.current).toBe(false)

    rerender({ fallbackIsFollowing: true })

    expect(result.current).toBe(true)
  })
})
