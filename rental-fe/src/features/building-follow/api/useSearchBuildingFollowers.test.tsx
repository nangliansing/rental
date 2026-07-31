import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  buildingFollowersQueryKey,
  buildingFollowersQueryOptions,
  useSearchBuildingFollowers,
} from "./useSearchBuildingFollowers"

const searchBuildingFollowers = vi.hoisted(() => vi.fn())

vi.mock("./searchBuildingFollowers", () => ({
  searchBuildingFollowers,
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

describe("buildingFollowersQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(
      buildingFollowersQueryKey({
        buildingId: "building-1",
        limit: 10,
      }),
    ).toEqual(
      queryKeys.buildingFollows.buildingList({
        buildingId: "building-1",
        limit: 10,
      }),
    )
  })

  it("defaults to the shared listing page size", () => {
    const options = buildingFollowersQueryOptions({ buildingId: "building-1" })

    expect(options.queryKey).toEqual(
      queryKeys.buildingFollows.buildingList({
        buildingId: "building-1",
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
    expect(options.initialPageParam).toBe(1)
    expect(typeof options.getNextPageParam).toBe("function")
  })

  it("stays disabled without a building id", () => {
    expect(buildingFollowersQueryOptions({ buildingId: "" }).enabled).toBe(false)
  })
})

describe("useSearchBuildingFollowers", () => {
  it("loads paginated followers for a building", async () => {
    searchBuildingFollowers.mockResolvedValueOnce({
      success: true,
      data: {
        followers: [
          {
            _id: "follow-1",
            userId: "user-1",
            buildingId: "building-1",
            createdAt: "2026-07-31T10:15:30.123Z",
            updatedAt: "2026-07-31T10:15:30.123Z",
            user: {
              _id: "user-1",
              name: "Jane Doe",
              displayName: "Fetch Agent",
              profilePhoto: null,
              isVerified: false,
            },
          },
        ],
      },
      pagination: { page: 1, limit: 20, total: 1 },
    })

    const { result } = renderHook(
      () => useSearchBuildingFollowers({ buildingId: "building-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pages[0]?.data.followers).toHaveLength(1)
    expect(searchBuildingFollowers).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: "building-1",
        page: 1,
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
  })
})
