import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"
import { createSearchBuilding } from "@/test/fixtures/listings"

import {
  parseBuildingFollowResponse,
  parseFollowedBuildingSummary,
  parseSearchBuildingFollow,
  parseSearchBuildingFollower,
  parseSearchBuildingFollowersResponse,
  parseSearchUserBuildingFollowsResponse,
} from "./buildingFollowParsers"

describe("buildingFollowParsers", () => {
  it("parseFollowedBuildingSummary omits viewer follow state", () => {
    const parsed = parseFollowedBuildingSummary(createSearchBuilding())

    expect(parsed.name).toBe("Bangkapi Residence")
    expect(parsed).not.toHaveProperty("isFollowing")
  })

  it("parseSearchBuildingFollow accepts null building snapshots", () => {
    const parsed = parseSearchBuildingFollow({
      _id: "follow-1",
      buildingId: "building-1",
      createdAt: "2026-07-31T10:15:30.123Z",
      updatedAt: "2026-07-31T10:15:30.123Z",
      building: null,
    })

    expect(parsed._id).toBe("follow-1")
    expect(parsed.building).toBeNull()
  })

  it("parseSearchUserBuildingFollowsResponse throws when followings is missing", () => {
    expect(() =>
      parseSearchUserBuildingFollowsResponse(
        { success: true, data: {} },
        { page: 1, limit: 20 },
      ),
    ).toThrow(ApiError)
  })

  it("parseSearchUserBuildingFollowsResponse parses paginated followings", () => {
    const parsed = parseSearchUserBuildingFollowsResponse(
      {
        success: true,
        data: {
          followings: [
            {
              _id: "follow-1",
              buildingId: "building-1",
              createdAt: "2026-07-31T10:15:30.123Z",
              updatedAt: "2026-07-31T10:15:30.123Z",
              building: createSearchBuilding(),
            },
          ],
        },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      { page: 1, limit: 20 },
    )

    expect(parsed.data.followings).toHaveLength(1)
    expect(parsed.data.followings[0]?.building?.name).toBe("Bangkapi Residence")
    expect(parsed.data.followings[0]?.building).not.toHaveProperty("isFollowing")
  })

  it("parseSearchUserBuildingFollowsResponse rejects pagination mismatches", () => {
    expect(() =>
      parseSearchUserBuildingFollowsResponse(
        {
          success: true,
          data: {
            followings: [],
          },
          pagination: { page: 2, limit: 20, total: 0, totalPages: 0 },
        },
        { page: 1, limit: 20 },
      ),
    ).toThrow(ApiError)
  })

  it("parseBuildingFollowResponse throws when success is false", () => {
    expect(() => parseBuildingFollowResponse({ success: false })).toThrow(
      ApiError,
    )
  })

  it("parseSearchBuildingFollower accepts null user snapshots", () => {
    const parsed = parseSearchBuildingFollower({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
      createdAt: "2026-07-31T10:15:30.123Z",
      updatedAt: "2026-07-31T10:15:30.123Z",
      user: null,
    })

    expect(parsed.user).toBeNull()
  })

  it("parseSearchBuildingFollowersResponse parses paginated followers", () => {
    const parsed = parseSearchBuildingFollowersResponse(
      {
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
                isVerified: true,
              },
            },
          ],
        },
        pagination: { page: 1, limit: 20, total: 1 },
      },
      { page: 1, limit: 20 },
    )

    expect(parsed.data.followers[0]?.user?.displayName).toBe("Fetch Agent")
  })
})
