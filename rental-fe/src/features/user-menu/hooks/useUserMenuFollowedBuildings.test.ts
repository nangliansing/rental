import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useUserMenuFollowedBuildings } from "./useUserMenuFollowedBuildings"

const useSearchUserBuildingFollows = vi.hoisted(() => vi.fn())

vi.mock("@/features/building-follow/api", () => ({
  useSearchUserBuildingFollows,
}))

describe("useUserMenuFollowedBuildings", () => {
  it("stays disabled without a user id", () => {
    useSearchUserBuildingFollows.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    })

    const { result } = renderHook(() =>
      useUserMenuFollowedBuildings({ userId: "  ", enabled: true }),
    )

    expect(result.current.isQueryEnabled).toBe(false)
    expect(useSearchUserBuildingFollows).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "",
        enabled: false,
      }),
    )
  })

  it("filters invalid follow rows from flattened pages", () => {
    useSearchUserBuildingFollows.mockReturnValue({
      data: {
        pages: [
          {
            data: {
              followings: [
                {
                  _id: "follow-1",
                  buildingId: "building-1",
                  building: { _id: "building-1", name: "One" },
                },
                {
                  _id: "   ",
                  buildingId: "building-2",
                  building: { _id: "building-2", name: "Two" },
                },
              ],
            },
            pagination: { page: 1, limit: 20, total: 2 },
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    })

    const { result } = renderHook(() =>
      useUserMenuFollowedBuildings({ userId: "user-1", enabled: true }),
    )

    expect(result.current.followedBuildings).toHaveLength(1)
    expect(result.current.followedBuildings[0]?._id).toBe("follow-1")
    expect(result.current.totalFollowedBuildings).toBe(2)
    expect(result.current.hasNextPage).toBe(true)
  })
})
