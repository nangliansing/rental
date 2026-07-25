import { ApiError, apiClient } from "@/lib/api-client"

import { parseListerReviewResponse } from "./listerReviewResponseParsers"

export type ToggleListerReviewCollapseInput = {
  reviewId: string
}

export async function toggleListerReviewCollapse({
  reviewId,
}: ToggleListerReviewCollapseInput) {
  const normalizedReviewId = reviewId.trim()
  if (!normalizedReviewId) {
    throw new ApiError("Review id is required.", 422, "VALIDATION_ERROR")
  }
  const response = await apiClient.patch<unknown>(
    `/lister-reviews/${encodeURIComponent(normalizedReviewId)}/toggle-collapse`,
  )

  return parseListerReviewResponse(response.data)
}
