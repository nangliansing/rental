import { ApiError, apiClient } from "@/lib/api-client"

import { parseListerReviewMutationResponse } from "./listerReviewResponseParsers"

export type DeleteListerReviewInput = {
  reviewId: string
}

export async function deleteListerReview({
  reviewId,
}: DeleteListerReviewInput) {
  const normalizedReviewId = reviewId.trim()
  if (!normalizedReviewId) {
    throw new ApiError("Review id is required.", 422, "VALIDATION_ERROR")
  }
  const response = await apiClient.delete<unknown>(
    `/lister-reviews/${encodeURIComponent(normalizedReviewId)}`,
  )

  return parseListerReviewMutationResponse(response.data)
}
