import { ApiError, apiClient } from "@/lib/api-client";

import {
  parseAdminPendingPost,
  type AdminPendingPost,
} from "./searchAdminPendingPosts";

type ApproveAdminPendingPostResponse = {
  success: true;
  data: AdminPendingPost;
};

export type ApproveAdminPendingPostInput = {
  pendingPostId: string;
  reason: string;
};

const readRecord = (value: unknown): Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const buildApproveAdminPendingPostPayload = (
  reason: string,
): { reason: string } => {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    throw new ApiError(
      "Approval reason is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  return {
    reason: trimmedReason,
  };
};

const parseApproveAdminPendingPostResponse = (value: unknown) => {
  return parseAdminPendingPost(readRecord(value).data);
};

export async function approveAdminPendingPost({
  pendingPostId,
  reason,
}: ApproveAdminPendingPostInput) {
  const normalizedPendingPostId = pendingPostId.trim();

  if (!normalizedPendingPostId) {
    throw new ApiError(
      "Pending post id is required.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const response = await apiClient.patch<ApproveAdminPendingPostResponse>(
    `/admin/pending-posts/${encodeURIComponent(normalizedPendingPostId)}/approve`,
    buildApproveAdminPendingPostPayload(reason),
  );

  return parseApproveAdminPendingPostResponse(response.data);
}
