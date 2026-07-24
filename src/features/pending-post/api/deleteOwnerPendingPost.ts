import { ApiError, apiClient } from "@/lib/api-client";

import { parsePendingPost, type PendingPost } from "./createPendingPost";

export type DeleteOwnerPendingPostResponse = {
  success: true;
  data: PendingPost;
};

export function isOwnerPendingPostNotFoundError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "PENDING_POST_NOT_FOUND" || error.status === 404)
  );
}

const readRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const parseDeleteOwnerPendingPostResponse = (value: unknown) => {
  return parsePendingPost(readRecord(value).data);
};

export async function deleteOwnerPendingPost(pendingPostId: string) {
  const normalizedPendingPostId = pendingPostId.trim();

  if (!normalizedPendingPostId) {
    throw new ApiError("Pending post id is required.", 422, "VALIDATION_ERROR");
  }

  const response = await apiClient.delete<DeleteOwnerPendingPostResponse>(
    `/pending-posts/${encodeURIComponent(normalizedPendingPostId)}`,
  );

  return parseDeleteOwnerPendingPostResponse(response.data);
}
