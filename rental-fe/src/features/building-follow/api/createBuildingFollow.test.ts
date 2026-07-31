import { afterEach, describe, expect, it, vi } from "vitest"

const apiClientMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      post: apiClientMocks.post,
    },
  }
})

import { createBuildingFollow } from "./createBuildingFollow"

const follow = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building / 1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
}

describe("createBuildingFollow", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("trims and encodes the building id and parses the response", async () => {
    apiClientMocks.post.mockResolvedValueOnce({
      data: { success: true, data: follow },
    })

    await expect(
      createBuildingFollow({ buildingId: "  building / 1  " }),
    ).resolves.toMatchObject({
      _id: "follow-1",
      buildingId: "building / 1",
    })

    expect(apiClientMocks.post).toHaveBeenCalledWith(
      "/building-follows/building%20%2F%201",
      {},
      true,
      undefined,
    )
  })

  it("forwards abort signals to the API client", async () => {
    apiClientMocks.post.mockResolvedValueOnce({
      data: { success: true, data: follow },
    })
    const controller = new AbortController()

    await createBuildingFollow({
      buildingId: "building-1",
      signal: controller.signal,
    })

    expect(apiClientMocks.post.mock.calls[0]?.[3]).toBe(controller.signal)
  })

  it("rejects an empty building id before requesting", async () => {
    await expect(createBuildingFollow({ buildingId: " " })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(apiClientMocks.post).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    apiClientMocks.post.mockResolvedValueOnce({
      data: { success: true, data: { _id: "follow-1" } },
    })

    await expect(
      createBuildingFollow({ buildingId: "building-1" }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_BUILDING_FOLLOW_RESPONSE",
    })
  })
})
