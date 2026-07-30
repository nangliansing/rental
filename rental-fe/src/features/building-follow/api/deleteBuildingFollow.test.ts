import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  isBuildingAlreadyFollowedError,
  isBuildingFollowNotFoundError,
} from "./deleteBuildingFollow"

describe("building follow state errors", () => {
  it("recognizes an already-followed response as the requested followed state", () => {
    expect(
      isBuildingAlreadyFollowedError(
        new ApiError(
          "Building is already followed",
          409,
          "BUILDING_ALREADY_FOLLOWED",
        ),
      ),
    ).toBe(true)
  })

  it("recognizes an already-unfollowed response as the requested unfollowed state", () => {
    expect(
      isBuildingFollowNotFoundError(
        new ApiError(
          "Building follow not found",
          404,
          "BUILDING_FOLLOW_NOT_FOUND",
        ),
      ),
    ).toBe(true)
  })

  it("does not hide unrelated request failures", () => {
    const error = new ApiError("Server unavailable", 503, "SERVICE_UNAVAILABLE")

    expect(isBuildingAlreadyFollowedError(error)).toBe(false)
    expect(isBuildingFollowNotFoundError(error)).toBe(false)
  })
})
