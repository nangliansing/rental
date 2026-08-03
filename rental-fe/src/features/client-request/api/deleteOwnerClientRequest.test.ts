import { readFileSync } from "node:fs"
import { join } from "node:path"

import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import {
  deleteOwnerClientRequest,
  isOwnerClientRequestNotFoundError,
  parseDeleteOwnerClientRequestResponse,
} from "./deleteOwnerClientRequest"

const deletedClientRequest = {
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
  },
  isDeleted: true,
  deletedAt: "2026-08-03T21:30:00.000Z",
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T21:30:00.000Z",
}

describe("parseDeleteOwnerClientRequestResponse", () => {
  it.each([
    ["Waiting", "Waiting"],
    ["Closed", "Closed"],
  ] as const)("accepts soft-deleted %s payloads", (status, expected) => {
    expect(
      parseDeleteOwnerClientRequestResponse({
        success: true,
        data: { ...deletedClientRequest, status },
      }),
    ).toEqual({
      success: true,
      data: expect.objectContaining({
        _id: deletedClientRequest._id,
        isDeleted: true,
        deletedAt: deletedClientRequest.deletedAt,
        status: expected,
      }),
    })
  })

  it.each([
    [{ success: true, data: { ...deletedClientRequest, isDeleted: false } }],
    [{ success: true, data: { ...deletedClientRequest, deletedAt: null } }],
    [{ success: true, data: { ...deletedClientRequest, deletedAt: "" } }],
    [{ success: true, data: { ...deletedClientRequest, isDeleted: "true" } }],
    [{ success: true, data: { _id: "broken" } }],
    [{ success: false, data: deletedClientRequest }],
    [{ success: true }],
    [null],
  ])("rejects incomplete delete responses (%j)", body => {
    expect(() => parseDeleteOwnerClientRequestResponse(body)).toThrow(
      expect.objectContaining({
        status: 500,
        code: "INVALID_CLIENT_REQUEST_RESPONSE",
      }),
    )
  })
})

describe("isOwnerClientRequestNotFoundError", () => {
  it("matches CLIENT_REQUEST_NOT_FOUND only", () => {
    expect(
      isOwnerClientRequestNotFoundError(
        new ApiError("missing", 404, "CLIENT_REQUEST_NOT_FOUND"),
      ),
    ).toBe(true)
    expect(
      isOwnerClientRequestNotFoundError(new ApiError("missing", 404)),
    ).toBe(false)
    expect(
      isOwnerClientRequestNotFoundError(
        new ApiError("missing", 404, "LISTING_NOT_FOUND"),
      ),
    ).toBe(false)
    expect(
      isOwnerClientRequestNotFoundError(
        new ApiError("closed", 409, "CLIENT_REQUEST_CLOSED"),
      ),
    ).toBe(false)
    expect(isOwnerClientRequestNotFoundError(new Error("network"))).toBe(false)
  })
})

describe("deleteOwnerClientRequest", () => {
  it("deletes by trimmed id and returns the soft-deleted ClientRequest", async () => {
    server.use(
      http.delete(
        "/api/v1/client-requests/:clientRequestId",
        ({ params }) => {
          expect(params.clientRequestId).toBe(deletedClientRequest._id)
          return HttpResponse.json({
            success: true,
            data: deletedClientRequest,
          })
        },
      ),
    )

    await expect(
      deleteOwnerClientRequest({
        clientRequestId: `  ${deletedClientRequest._id}  `,
      }),
    ).resolves.toMatchObject({
      _id: deletedClientRequest._id,
      isDeleted: true,
      deletedAt: deletedClientRequest.deletedAt,
      status: "Waiting",
    })
  })

  it("accepts soft-deleted Closed responses", async () => {
    server.use(
      http.delete("/api/v1/client-requests/:clientRequestId", () =>
        HttpResponse.json({
          success: true,
          data: { ...deletedClientRequest, status: "Closed" },
        }),
      ),
    )

    await expect(
      deleteOwnerClientRequest({
        clientRequestId: deletedClientRequest._id,
      }),
    ).resolves.toMatchObject({
      status: "Closed",
      isDeleted: true,
    })
  })

  it("encodes client request ids in the request path", async () => {
    const id = "id/with spaces"
    server.use(
      http.delete("/api/v1/client-requests/:clientRequestId", ({ request }) => {
        expect(new URL(request.url).pathname).toBe(
          `/api/v1/client-requests/${encodeURIComponent(id)}`,
        )
        return HttpResponse.json({
          success: true,
          data: { ...deletedClientRequest, _id: id },
        })
      }),
    )

    await expect(
      deleteOwnerClientRequest({ clientRequestId: id }),
    ).resolves.toMatchObject({ _id: id, isDeleted: true })
  })

  it("rejects empty ids before requesting", async () => {
    const request = vi.fn()
    server.use(http.delete("/api/v1/client-requests/:clientRequestId", request))

    await expect(
      deleteOwnerClientRequest({ clientRequestId: " " }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Client request id is required.",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: true, data: { ...deletedClientRequest, isDeleted: false } }],
    [{ success: true, data: { ...deletedClientRequest, deletedAt: null } }],
    [{ success: true, data: { _id: "broken" } }],
    [{ success: true }],
    [null],
  ])("rejects malformed success responses (%j)", async body => {
    server.use(
      http.delete("/api/v1/client-requests/:clientRequestId", () =>
        HttpResponse.json(body),
      ),
    )

    await expect(
      deleteOwnerClientRequest({
        clientRequestId: deletedClientRequest._id,
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_CLIENT_REQUEST_RESPONSE",
    })
  })

  it.each([
    [404, "CLIENT_REQUEST_NOT_FOUND"],
    [422, "VALIDATION_ERROR"],
    [403, "ACCOUNT_SUSPENDED"],
  ] as const)("propagates API %s %s failures", async (status, code) => {
    server.use(
      http.delete("/api/v1/client-requests/:clientRequestId", () =>
        HttpResponse.json(
          { success: false, code, message: code },
          { status },
        ),
      ),
    )

    await expect(
      deleteOwnerClientRequest({
        clientRequestId: deletedClientRequest._id,
      }),
    ).rejects.toMatchObject({ status, code })
  })

  it("propagates auth failures after refresh is rejected", async () => {
    server.use(
      http.delete("/api/v1/client-requests/:clientRequestId", () =>
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
      deleteOwnerClientRequest({
        clientRequestId: deletedClientRequest._id,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})

describe("useDeleteOwnerClientRequest source contract", () => {
  it("uses optimistic transactions, shared write scope, and 404 idempotency", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/client-request/api/useDeleteOwnerClientRequest.ts",
      ),
      "utf8",
    )
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")

    expect(code).toContain("createOptimisticTransaction")
    expect(code).toContain("OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID")
    expect(code).toContain("isOwnerClientRequestNotFoundError")
    expect(code).toContain("removeOwnerClientRequestFromLists")
    expect(code).toContain("createOptimisticDeletedClientRequest")
    expect(code).toContain("shouldInvalidate: ({ error }) => error === null")
    expect(code).not.toContain("updateOwnerClientRequestCache")
    expect(code).not.toContain("updateStatusCache")
  })
})
