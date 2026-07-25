import { ApiError, apiClient } from "@/lib/api-client"

import type {
  ListerReviewTag,
} from "./createListerReview"
import { parseListerReviewMutationResponse } from "./listerReviewResponseParsers"

export type UpdateListerReviewInput = {
  reviewId: string
  rating?: number
  tags?: ListerReviewTag[]
  comment?: string | null
  relatedListingId?: string | null
  relatedBuildingId?: string | null
}

export async function updateListerReview({
  reviewId,
  rating,
  tags,
  comment,
  relatedListingId,
  relatedBuildingId,
}: UpdateListerReviewInput) {
  const normalizedReviewId = reviewId.trim()
  if (!normalizedReviewId) {
    throw new ApiError("Review id is required.", 422, "VALIDATION_ERROR")
  }
  if (
    rating !== undefined &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    throw new ApiError("Rating must be between 1 and 5.", 422, "VALIDATION_ERROR")
  }

  const body = {
    ...(rating !== undefined ? { rating } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(comment !== undefined ? { comment: comment?.trim() || null } : {}),
    ...(relatedListingId !== undefined
      ? { relatedListingId: relatedListingId?.trim() || null }
      : {}),
    ...(relatedBuildingId !== undefined
      ? { relatedBuildingId: relatedBuildingId?.trim() || null }
      : {}),
  }

  const response = await apiClient.patch<unknown>(
    `/lister-reviews/${encodeURIComponent(normalizedReviewId)}`,
    body,
  )

  return parseListerReviewMutationResponse(response.data)
}
