import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import {
  deleteOwnerPendingPost,
  isOwnerPendingPostNotFoundError,
} from "./deleteOwnerPendingPost"

describe("deleteOwnerPendingPost", () => {
  it("deletes an encoded id and parses the deleted post", async () => {
    server.use(
      http.delete("/api/v1/pending-posts/:pendingPostId", ({ params }) => {
        expect(params.pendingPostId).toBe("post / 1")
        return HttpResponse.json({
          success: true,
          data: {
            _id: "post / 1",
            submittedBy: "user-1",
            status: "CANCELED",
          },
        })
      }),
    )

    const result = await deleteOwnerPendingPost("  post / 1  ")

    expect(result).toEqual(
      expect.objectContaining({
        _id: "post / 1",
        submittedBy: "user-1",
        status: "CANCELED",
      }),
    )
  })

  it("rejects an empty id before sending a request", async () => {
    const request = vi.fn()
    server.use(http.delete("/api/v1/pending-posts/:id", request))

    await expect(deleteOwnerPendingPost("   ")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects a malformed success response", async () => {
    server.use(
      http.delete("/api/v1/pending-posts/:id", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(deleteOwnerPendingPost("post-1")).rejects.toMatchObject({
      status: 500,
      code: "INVALID_PENDING_POST_RESPONSE",
    })
  })

  it("recognizes not-found by code or HTTP status", () => {
    expect(
      isOwnerPendingPostNotFoundError(
        new ApiError("Missing", 404, "PENDING_POST_NOT_FOUND"),
      ),
    ).toBe(true)
    expect(isOwnerPendingPostNotFoundError(new ApiError("Missing", 404))).toBe(
      true,
    )
    expect(
      isOwnerPendingPostNotFoundError(
        new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE"),
      ),
    ).toBe(false)
  })
})
