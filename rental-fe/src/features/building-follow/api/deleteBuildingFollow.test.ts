import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

const apiClientMocks = vi.hoisted(() => ({
  delete: vi.fn(),
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      delete: apiClientMocks.delete,
    },
  }
})

import {
  deleteBuildingFollow,
  isBuildingAlreadyFollowedError,
  isBuildingFollowNotFoundError,
} from "./deleteBuildingFollow"

const follow = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building / 1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
}

describe("deleteBuildingFollow", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("trims and encodes the building id and parses the response", async () => {
    apiClientMocks.delete.mockResolvedValueOnce({
      data: { success: true, data: follow },
    })

    await expect(
      deleteBuildingFollow({ buildingId: "  building / 1  " }),
    ).resolves.toMatchObject({
      _id: "follow-1",
      buildingId: "building / 1",
    })

    expect(apiClientMocks.delete).toHaveBeenCalledWith(
      "/building-follows/building%20%2F%201",
      undefined,
      true,
      undefined,
    )
  })

  it("forwards abort signals to the API client", async () => {
    apiClientMocks.delete.mockResolvedValueOnce({
      data: { success: true, data: follow },
    })
    const controller = new AbortController()

    await deleteBuildingFollow({
      buildingId: "building-1",
      signal: controller.signal,
    })

    expect(apiClientMocks.delete.mock.calls[0]?.[3]).toBe(controller.signal)
  })

  it("rejects an empty building id before requesting", async () => {
    await expect(deleteBuildingFollow({ buildingId: " " })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(apiClientMocks.delete).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    apiClientMocks.delete.mockResolvedValueOnce({
      data: { success: true, data: { _id: "follow-1" } },
    })

    await expect(
      deleteBuildingFollow({ buildingId: "building-1" }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_BUILDING_FOLLOW_RESPONSE",
    })
  })
})

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
