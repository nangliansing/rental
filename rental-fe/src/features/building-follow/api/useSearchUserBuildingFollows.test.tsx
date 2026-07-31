import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  buildingFollowsQueryKey,
  buildingFollowsQueryOptions,
  useSearchUserBuildingFollows,
} from "./useSearchUserBuildingFollows"

const searchUserBuildingFollows = vi.hoisted(() => vi.fn())

vi.mock("./searchUserBuildingFollows", () => ({
  searchUserBuildingFollows,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function pendingSignals() {
  const signals: AbortSignal[] = []
  searchUserBuildingFollows.mockImplementation(
    (input: { signal?: AbortSignal }) => {
      if (input.signal) signals.push(input.signal)
      return new Promise(() => undefined)
    },
  )
  return signals
}

describe("buildingFollowsQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(
      buildingFollowsQueryKey({
        userId: "user-1",
        limit: 10,
      }),
    ).toEqual(
      queryKeys.buildingFollows.list({
        userId: "user-1",
        limit: 10,
      }),
    )
  })

  it("defaults to the shared listing page size", () => {
    const options = buildingFollowsQueryOptions({ userId: "user-1" })

    expect(options.queryKey).toEqual(
      queryKeys.buildingFollows.list({
        userId: "user-1",
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
    expect(options.initialPageParam).toBe(1)
    expect(typeof options.getNextPageParam).toBe("function")
  })

  it("uses distinct cache entries per user", () => {
    const userOne = buildingFollowsQueryOptions({ userId: "user-1" })
    const userTwo = buildingFollowsQueryOptions({ userId: "user-2" })

    expect(userOne.queryKey).not.toEqual(userTwo.queryKey)
  })

  it("stays disabled without a user id", () => {
    expect(buildingFollowsQueryOptions({ userId: "" }).enabled).toBe(false)
    expect(buildingFollowsQueryOptions({ enabled: false }).enabled).toBe(false)
  })

  it("forwards AbortSignal to the fetcher", async () => {
    searchUserBuildingFollows.mockResolvedValueOnce({
      success: true,
      data: { followings: [] },
      pagination: { page: 1, limit: DEFAULT_LISTING_PAGE_SIZE, total: 0 },
    })
    const options = buildingFollowsQueryOptions({ userId: "user-1" })
    const controller = new AbortController()

    await options.queryFn({
      pageParam: 1,
      signal: controller.signal,
      queryKey: options.queryKey,
      meta: undefined,
      direction: "forward",
    })

    expect(searchUserBuildingFollows).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        page: 1,
        limit: DEFAULT_LISTING_PAGE_SIZE,
        signal: controller.signal,
      }),
    )
  })
})

describe("useSearchUserBuildingFollows", () => {
  it("aborts the previous request when the user id changes", async () => {
    const signals = pendingSignals()
    const { rerender, unmount } = renderHook(
      ({ userId }: { userId: string }) =>
        useSearchUserBuildingFollows({ userId }),
      { initialProps: { userId: "user-1" }, wrapper: createWrapper() },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ userId: "user-2" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })
})
