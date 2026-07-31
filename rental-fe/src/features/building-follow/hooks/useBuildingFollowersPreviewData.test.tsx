import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useSearchBuildingFollowers: vi.fn(),
}))

vi.mock("../api/useSearchBuildingFollowers", () => ({
  useSearchBuildingFollowers: mocks.useSearchBuildingFollowers,
}))

import { useBuildingFollowersPreviewData } from "./useBuildingFollowersPreviewData"

describe("useBuildingFollowersPreviewData", () => {
  it("disables the query when the building id is missing", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
    })

    const { result } = renderHook(() =>
      useBuildingFollowersPreviewData({ buildingId: "  " }),
    )

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.shouldRender).toBe(false)
  })

  it("returns loading state for the initial fetch", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    })

    const { result } = renderHook(() =>
      useBuildingFollowersPreviewData({ buildingId: "building-1" }),
    )

    expect(result.current.isInitialLoading).toBe(true)
    expect(result.current.shouldRender).toBe(true)
  })

  it("hides the preview after an initial error", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    })

    const { result } = renderHook(() =>
      useBuildingFollowersPreviewData({ buildingId: "building-1" }),
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.shouldRender).toBe(false)
  })

  it("normalizes follower totals and list data", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [
          {
            data: {
              followers: [
                {
                  _id: "follow-1",
                  userId: "user-1",
                  buildingId: "building-1",
                  createdAt: undefined,
                  updatedAt: undefined,
                  user: null,
                },
              ],
            },
            pagination: { total: 12.9 },
          },
        ],
      },
    })

    const { result } = renderHook(() =>
      useBuildingFollowersPreviewData({ buildingId: " building-1 " }),
    )

    expect(result.current.buildingId).toBe("building-1")
    expect(result.current.totalFollowers).toBe(12)
    expect(result.current.hasFollowers).toBe(true)
    expect(result.current.followers).toHaveLength(1)
  })
})
