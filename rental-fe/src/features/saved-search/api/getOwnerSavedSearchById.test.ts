import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { getOwnerSavedSearchById } from "./getOwnerSavedSearchById"

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock("@/lib/api-client", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      get: apiClientMocks.get,
    },
  }
})

const savedSearch = {
  _id: "6a70f2002c0e518d5b689200",
  createdBy: "6a5638bafc6d6328c9e1b281",
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15000,
    maxRent: 35000,
    availableBy: "2026-09-01T17:00:00.000Z",
    agentProfileIds: ["6a5638bafc6d6328c9e1b299"],
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

describe("getOwnerSavedSearchById", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("requests the detail path with abort signal options", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: savedSearch },
    })
    const controller = new AbortController()

    await getOwnerSavedSearchById(savedSearch._id, controller.signal)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/saved-searches/${savedSearch._id}`,
      { signal: controller.signal },
    )
  })

  it("allows omitting the abort signal", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: savedSearch },
    })

    await getOwnerSavedSearchById(savedSearch._id)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/saved-searches/${savedSearch._id}`,
      { signal: undefined },
    )
  })

  it.each([
    ["  spaced-id  ", "/saved-searches/spaced-id"],
    ["req/1", "/saved-searches/req%2F1"],
    ["a b", "/saved-searches/a%20b"],
    ["id?x=1", "/saved-searches/id%3Fx%3D1"],
    ["id#hash", "/saved-searches/id%23hash"],
  ])("trims/encodes id %j to %s", async (input, path) => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...savedSearch, _id: input.trim() },
      },
    })

    await getOwnerSavedSearchById(input)

    expect(apiClientMocks.get).toHaveBeenCalledWith(path, {
      signal: undefined,
    })
  })

  it("returns the unwrapped Waiting SavedSearch", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: savedSearch },
    })

    const result = await getOwnerSavedSearchById(savedSearch._id)

    expect(result).toMatchObject({
      _id: savedSearch._id,
      name: "Sukhumvit 2BR",
      status: "Waiting",
      geoSearch: { mode: "area", placeName: "Phrom Phong" },
      filters: {
        minRent: 15000,
        maxRent: 35000,
        availableBy: "2026-09-01T17:00:00.000Z",
      },
    })
  })

  it("parses Closed and nearby/line geo payloads", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...savedSearch,
          status: "Closed",
          description: null,
          geoSearch: {
            mode: "nearby",
            position: { lat: 13.75, lng: 100.5 },
            radiusMeters: 800,
            placeName: null,
          },
        },
      },
    })

    const closedNearby = await getOwnerSavedSearchById(savedSearch._id)
    expect(closedNearby.status).toBe("Closed")
    expect(closedNearby.description).toBeNull()
    expect(closedNearby.geoSearch).toMatchObject({
      mode: "nearby",
      radiusMeters: 800,
      placeName: null,
    })

    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...savedSearch,
          geoSearch: {
            mode: "line",
            geometry: {
              type: "LineString",
              coordinates: [
                [100.5, 13.75],
                [100.52, 13.76],
              ],
            },
            distanceMeters: 300,
          },
        },
      },
    })

    const line = await getOwnerSavedSearchById(savedSearch._id)
    expect(line.geoSearch.mode).toBe("line")
    expect(line.geoSearch.distanceMeters).toBe(300)
  })

  it.each(["", "   ", "\n\t"])(
    "rejects empty saved search ids before calling the API (%j)",
    async savedSearchId => {
      await expect(
        getOwnerSavedSearchById(savedSearchId),
      ).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Saved search id is required.",
      })

      expect(apiClientMocks.get).not.toHaveBeenCalled()
    },
  )

  it.each([
    [{ success: false }],
    [{ success: "true", data: savedSearch }],
    [null],
    ["body"],
  ])("rejects malformed envelopes (%j)", async body => {
    apiClientMocks.get.mockResolvedValueOnce({ data: body })

    await expect(
      getOwnerSavedSearchById(savedSearch._id),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_SAVED_SEARCH_RESPONSE",
    })
  })

  it("rejects malformed saved search payloads", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: { _id: "broken" } },
    })

    await expect(
      getOwnerSavedSearchById(savedSearch._id),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it.each([
    [401, "ACCESS_TOKEN_REQUIRED", "Please log in to continue."],
    [403, "ACCOUNT_SUSPENDED", "Your account is suspended."],
    [404, "SAVED_SEARCH_NOT_FOUND", "This saved search could not be found."],
    [422, "VALIDATION_ERROR", "savedSearchId must be a valid id"],
  ] as const)(
    "propagates %s %s from apiClient",
    async (status, code, message) => {
      apiClientMocks.get.mockRejectedValueOnce(
        new ApiError(message, status, code),
      )

      await expect(
        getOwnerSavedSearchById(savedSearch._id),
      ).rejects.toMatchObject({ status, code, message })
    },
  )

  it("propagates abort rejections from apiClient", async () => {
    const abortError = new DOMException("Aborted", "AbortError")
    apiClientMocks.get.mockRejectedValueOnce(abortError)

    await expect(
      getOwnerSavedSearchById(savedSearch._id, new AbortController().signal),
    ).rejects.toBe(abortError)
  })
})
