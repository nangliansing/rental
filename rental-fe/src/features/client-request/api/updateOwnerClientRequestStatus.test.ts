import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { updateOwnerClientRequestStatus } from "./updateOwnerClientRequestStatus"

const closedClientRequest = {
  _id: "6a70f2002c0e518d5b689200",
  createdBy: "6a5638bafc6d6328c9e1b281",
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: "Closed",
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
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-04T01:00:00.000Z",
}

describe("updateOwnerClientRequestStatus", () => {
  it("patches Closed status and returns the unwrapped ClientRequest", async () => {
    server.use(
      http.patch(
        "/api/v1/client-requests/:clientRequestId/status",
        async ({ params, request }) => {
          expect(params.clientRequestId).toBe(closedClientRequest._id)
          await expect(request.json()).resolves.toEqual({ status: "Closed" })
          return HttpResponse.json({
            success: true,
            data: closedClientRequest,
          })
        },
      ),
    )

    await expect(
      updateOwnerClientRequestStatus({
        clientRequestId: `  ${closedClientRequest._id}  `,
        status: "Closed",
      }),
    ).resolves.toMatchObject({
      _id: closedClientRequest._id,
      status: "Closed",
      name: "Sukhumvit 2BR",
    })
  })

  it.each([
    ["req/1", "req/1"],
    ["a b", "a b"],
    ["id?x=1", "id?x=1"],
  ])("encodes client request id %j", async (input, expectedParam) => {
    server.use(
      http.patch(
        "/api/v1/client-requests/:clientRequestId/status",
        ({ params }) => {
          expect(params.clientRequestId).toBe(expectedParam)
          return HttpResponse.json({
            success: true,
            data: { ...closedClientRequest, _id: expectedParam },
          })
        },
      ),
    )

    await updateOwnerClientRequestStatus({
      clientRequestId: input,
      status: "Closed",
    })
  })

  it.each(["", "   ", "\n\t"])(
    "rejects empty ids before requesting (%j)",
    async clientRequestId => {
      const request = vi.fn()
      server.use(
        http.patch("/api/v1/client-requests/:clientRequestId/status", request),
      )

      await expect(
        updateOwnerClientRequestStatus({
          clientRequestId,
          status: "Closed",
        }),
      ).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Client request id is required.",
      })
      expect(request).not.toHaveBeenCalled()
    },
  )

  it("rejects non-Closed status before requesting", async () => {
    const request = vi.fn()
    server.use(
      http.patch("/api/v1/client-requests/:clientRequestId/status", request),
    )

    await expect(
      updateOwnerClientRequestStatus({
        clientRequestId: closedClientRequest._id,
        status: "Waiting" as "Closed",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "status must be Closed.",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: true, data: { _id: "broken" } }],
    [{ success: false, data: closedClientRequest }],
    [{ success: true }],
    [null],
  ])("rejects malformed success responses (%j)", async body => {
    server.use(
      http.patch("/api/v1/client-requests/:clientRequestId/status", () =>
        HttpResponse.json(body),
      ),
    )

    await expect(
      updateOwnerClientRequestStatus({
        clientRequestId: closedClientRequest._id,
        status: "Closed",
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_CLIENT_REQUEST_RESPONSE",
    })
  })

  it.each([
    [403, "ACCOUNT_SUSPENDED"],
    [404, "CLIENT_REQUEST_NOT_FOUND"],
    [409, "CLIENT_REQUEST_CLOSED"],
    [422, "VALIDATION_ERROR"],
  ] as const)("propagates API %s %s failures", async (status, code) => {
    server.use(
      http.patch("/api/v1/client-requests/:clientRequestId/status", () =>
        HttpResponse.json(
          { success: false, code, message: code },
          { status },
        ),
      ),
    )

    await expect(
      updateOwnerClientRequestStatus({
        clientRequestId: closedClientRequest._id,
        status: "Closed",
      }),
    ).rejects.toMatchObject({ status, code })
  })

  it("propagates auth failures after refresh is rejected", async () => {
    server.use(
      http.patch("/api/v1/client-requests/:clientRequestId/status", () =>
        HttpResponse.json(
          {
            success: false,
            code: "ACCESS_TOKEN_REQUIRED",
            message: "Access token is required",
          },
          { status: 401 },
        ),
      ),
      http.post("/api/v1/users/token/refresh", () =>
        HttpResponse.json(
          {
            success: false,
            code: "INVALID_REFRESH_TOKEN",
            message: "Your session expired. Please log in again.",
          },
          { status: 401 },
        ),
      ),
    )

    await expect(
      updateOwnerClientRequestStatus({
        clientRequestId: closedClientRequest._id,
        status: "Closed",
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})
