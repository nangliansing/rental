import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { getOwnerClientRequestById } from "./getOwnerClientRequestById"

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

const clientRequest = {
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

describe("getOwnerClientRequestById", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("requests the detail path with abort signal options", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: clientRequest },
    })
    const controller = new AbortController()

    await getOwnerClientRequestById(clientRequest._id, controller.signal)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/client-requests/${clientRequest._id}`,
      { signal: controller.signal },
    )
  })

  it("allows omitting the abort signal", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: clientRequest },
    })

    await getOwnerClientRequestById(clientRequest._id)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/client-requests/${clientRequest._id}`,
      { signal: undefined },
    )
  })

  it.each([
    ["  spaced-id  ", "/client-requests/spaced-id"],
    ["req/1", "/client-requests/req%2F1"],
    ["a b", "/client-requests/a%20b"],
    ["id?x=1", "/client-requests/id%3Fx%3D1"],
    ["id#hash", "/client-requests/id%23hash"],
  ])("trims/encodes id %j to %s", async (input, path) => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...clientRequest, _id: input.trim() },
      },
    })

    await getOwnerClientRequestById(input)

    expect(apiClientMocks.get).toHaveBeenCalledWith(path, {
      signal: undefined,
    })
  })

  it("returns the unwrapped Waiting ClientRequest", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: clientRequest },
    })

    const result = await getOwnerClientRequestById(clientRequest._id)

    expect(result).toMatchObject({
      _id: clientRequest._id,
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
          ...clientRequest,
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

    const closedNearby = await getOwnerClientRequestById(clientRequest._id)
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
          ...clientRequest,
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

    const line = await getOwnerClientRequestById(clientRequest._id)
    expect(line.geoSearch.mode).toBe("line")
    expect(line.geoSearch.distanceMeters).toBe(300)
  })

  it.each(["", "   ", "\n\t"])(
    "rejects empty client request ids before calling the API (%j)",
    async clientRequestId => {
      await expect(
        getOwnerClientRequestById(clientRequestId),
      ).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Client request id is required.",
      })

      expect(apiClientMocks.get).not.toHaveBeenCalled()
    },
  )

  it.each([
    [{ success: false }],
    [{ success: "true", data: clientRequest }],
    [null],
    ["body"],
  ])("rejects malformed envelopes (%j)", async body => {
    apiClientMocks.get.mockResolvedValueOnce({ data: body })

    await expect(
      getOwnerClientRequestById(clientRequest._id),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_CLIENT_REQUEST_RESPONSE",
    })
  })

  it("rejects malformed client request payloads", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: { _id: "broken" } },
    })

    await expect(
      getOwnerClientRequestById(clientRequest._id),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it.each([
    [401, "ACCESS_TOKEN_REQUIRED", "Please log in to continue."],
    [403, "ACCOUNT_SUSPENDED", "Your account is suspended."],
    [404, "CLIENT_REQUEST_NOT_FOUND", "This client request could not be found."],
    [422, "VALIDATION_ERROR", "clientRequestId must be a valid id"],
  ] as const)(
    "propagates %s %s from apiClient",
    async (status, code, message) => {
      apiClientMocks.get.mockRejectedValueOnce(
        new ApiError(message, status, code),
      )

      await expect(
        getOwnerClientRequestById(clientRequest._id),
      ).rejects.toMatchObject({ status, code, message })
    },
  )

  it("propagates abort rejections from apiClient", async () => {
    const abortError = new DOMException("Aborted", "AbortError")
    apiClientMocks.get.mockRejectedValueOnce(abortError)

    await expect(
      getOwnerClientRequestById(clientRequest._id, new AbortController().signal),
    ).rejects.toBe(abortError)
  })
})
