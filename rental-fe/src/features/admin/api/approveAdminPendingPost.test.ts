import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/server";

import { approveAdminPendingPost } from "./approveAdminPendingPost";

describe("approveAdminPendingPost", () => {
  it("trims input, encodes the id, and parses approval identifiers", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/pending-posts/:pendingPostId/approve",
        async ({ params, request }) => {
          expect(params.pendingPostId).toBe("post / 1");
          await expect(request.json()).resolves.toEqual({ reason: "Verified" });
          return HttpResponse.json({
            success: true,
            data: {
              _id: "post / 1",
              status: "APPROVED",
              approvedBuildingId: "building-1",
              approvedListingId: "listing-1",
            },
          });
        },
      ),
    );

    await expect(
      approveAdminPendingPost({
        pendingPostId: "  post / 1  ",
        reason: "  Verified  ",
      }),
    ).resolves.toMatchObject({
      _id: "post / 1",
      status: "APPROVED",
      approvedBuildingId: "building-1",
      approvedListingId: "listing-1",
    });
  });

  it("rejects empty input before sending a request", async () => {
    const request = vi.fn();
    server.use(
      http.patch("/api/v1/admin/pending-posts/:id/approve", request),
    );

    await expect(
      approveAdminPendingPost({ pendingPostId: " ", reason: "Verified" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    await expect(
      approveAdminPendingPost({ pendingPostId: "post-1", reason: " " }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/pending-posts/:id/approve", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    );

    await expect(
      approveAdminPendingPost({
        pendingPostId: "post-1",
        reason: "Verified",
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_ADMIN_PENDING_POST_RESPONSE",
    });
  });
});
