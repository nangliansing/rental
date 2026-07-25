import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/server";

import { rejectAdminPendingPost } from "./rejectAdminPendingPost";

describe("rejectAdminPendingPost", () => {
  it("trims input, encodes the id, and parses the rejected post", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/pending-posts/:pendingPostId/reject",
        async ({ params, request }) => {
          expect(params.pendingPostId).toBe("post / 1");
          await expect(request.json()).resolves.toEqual({
            reason: "Incomplete details",
          });

          return HttpResponse.json({
            success: true,
            data: {
              _id: "post / 1",
              status: "REJECTED",
              reviewNote: "Incomplete details",
            },
          });
        },
      ),
    );

    const result = await rejectAdminPendingPost({
      pendingPostId: "  post / 1  ",
      reason: "  Incomplete details  ",
    });

    expect(result).toMatchObject({
      _id: "post / 1",
      status: "REJECTED",
      reviewNote: "Incomplete details",
    });
  });

  it("rejects empty input without sending a request", async () => {
    const request = vi.fn();
    server.use(
      http.patch("/api/v1/admin/pending-posts/:id/reject", request),
    );

    await expect(
      rejectAdminPendingPost({ pendingPostId: " ", reason: "Reason" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    await expect(
      rejectAdminPendingPost({ pendingPostId: "post-1", reason: " " }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/pending-posts/:id/reject", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    );

    await expect(
      rejectAdminPendingPost({ pendingPostId: "post-1", reason: "Reason" }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_ADMIN_PENDING_POST_RESPONSE",
    });
  });
});
