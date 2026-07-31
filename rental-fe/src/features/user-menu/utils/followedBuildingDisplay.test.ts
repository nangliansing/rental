import { describe, expect, it } from "vitest"

import { createSearchBuilding } from "@/test/fixtures/listings"

import {
  getFollowedBuildingAddress,
  getFollowedBuildingLabel,
  getFollowedBuildingPath,
  isRenderableFollowedBuilding,
  normalizeFollowedBuildingFollowId,
} from "./followedBuildingDisplay"

const follow = {
  _id: "follow-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  building: createSearchBuilding(),
}

describe("followedBuildingDisplay", () => {
  it("normalizes follow ids defensively", () => {
    expect(normalizeFollowedBuildingFollowId(follow)).toBe("follow-1")
    expect(normalizeFollowedBuildingFollowId({ ...follow, _id: "  " })).toBeNull()
    expect(normalizeFollowedBuildingFollowId(null)).toBeNull()
  })

  it("builds labels and addresses from building data with fallbacks", () => {
    expect(getFollowedBuildingLabel(follow)).toBe("Bangkapi Residence")
    expect(getFollowedBuildingAddress(follow)).toBe("Bang Kapi, Bangkok")
    expect(getFollowedBuildingPath(follow)).toBe("/buildings/building-1")

    expect(
      getFollowedBuildingLabel({
        ...follow,
        building: null,
      }),
    ).toBe("Building building-1")
  })

  it("filters out rows without a valid follow id", () => {
    expect(isRenderableFollowedBuilding(follow)).toBe(true)
    expect(isRenderableFollowedBuilding({ ...follow, _id: "   " })).toBe(false)
  })
})
