import { ApiError, apiClient } from "@/lib/api-client";

import {
  parseAdminPendingPost,
  type AdminPendingPost,
} from "./searchAdminPendingPosts";

type RejectAdminPendingPostResponse = {
  success: true;
  data: AdminPendingPost;
};

export type RejectAdminPendingPostInput = {
  pendingPostId: string;
  reason: string;
};

const readRecord = (value: unknown): Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const buildRejectAdminPendingPostPayload = (
  reason: string,
): { reason: string } => {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new ApiError(
      "Rejection reason is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    reason: trimmedReason,
  };
};

const parseRejectAdminPendingPostResponse = (value: unknown) => {
  return parseAdminPendingPost(readRecord(value).data);
};

export async function rejectAdminPendingPost({
  pendingPostId,
  reason,
}: RejectAdminPendingPostInput) {
  const normalizedPendingPostId = pendingPostId.trim();

  if (!normalizedPendingPostId) {
    throw new ApiError(
      "Pending post id is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const response = await apiClient.patch<RejectAdminPendingPostResponse>(
    `/admin/pending-posts/${encodeURIComponent(normalizedPendingPostId)}/reject`,
    buildRejectAdminPendingPostPayload(reason),
  );

  return parseRejectAdminPendingPostResponse(response.data);
}
