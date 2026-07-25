import { ApiError, apiClient } from "@/lib/api-client"

import type { UploadedMedia } from "@/features/uploads"

import { parseListerReviewMutationResponse } from "./listerReviewResponseParsers"

export type ListerReviewSort = "latest" | "oldest" | "highest" | "lowest"

export type ListerReviewTag =
  | "RESPONSIVE"
  | "HELPFUL"
  | "ACCURATE_INFO"
  | "FRIENDLY"
  | "CLEAR_COMMUNICATION"
  | "FAST_FOLLOW_UP"
  | "UNRESPONSIVE"
  | "INACCURATE_INFO"
  | "RUDE"
  | "SUSPICIOUS"
  | "PRESSURE_TACTICS"

export type ListerReviewRatingCounts = {
  oneStar: number
  twoStars: number
  threeStars: number
  fourStars: number
  fiveStars: number
}

export type ListerReviewTagCount = {
  tag: ListerReviewTag
  count: number
}

export type ListerReviewSummary = {
  averageRating: number
  reviewCount: number
  ratingCounts: ListerReviewRatingCounts
  tagCounts: ListerReviewTagCount[]
}

export type ListerReviewVerificationSource = "CONTACT_CLICK"

export type ListerReviewInteraction = {
  isVerified: boolean
  verifiedBy: ListerReviewVerificationSource | null
  contactEventId: string | null
  verifiedAt: string | null
}

export type ListerReviewModeration = {
  hiddenBy: string | null
  hiddenAt: string | null
  hiddenReason: string | null
  removedBy: string | null
  removedAt: string | null
  removedReason: string | null
}

export type ListerReviewVisibility = {
  isCollapsed: boolean
  collapsedBy: string | null
  collapsedAt: string | null
  collapseReason: string | null
}

export type ListerReviewReviewer = {
  userId: string
  name: string | null
  displayName: string | null
  profilePhoto: UploadedMedia | null
  isVerified: boolean
}

export type ListerReview = {
  _id: string
  reviewerId: string
  listerProfileId: string
  relatedListingId: string | null
  relatedBuildingId: string | null
  rating: number
  tags: ListerReviewTag[]
  comment: string | null
  interaction: ListerReviewInteraction
  moderation: ListerReviewModeration
  visibility: ListerReviewVisibility
  editedAt: string | null
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  reviewer?: ListerReviewReviewer
}

export type CreateListerReviewInput = {
  listerProfileId: string
  rating: number
  tags?: ListerReviewTag[]
  comment?: string | null
  relatedListingId?: string | null
  relatedBuildingId?: string | null
}

export type ListerReviewMutationResult = {
  review: ListerReview
  reviewSummary: ListerReviewSummary
}

export async function createListerReview({
  listerProfileId,
  rating,
  tags = [],
  comment = null,
  relatedListingId = null,
  relatedBuildingId = null,
}: CreateListerReviewInput) {
  const normalizedListerProfileId = listerProfileId.trim()
  if (!normalizedListerProfileId) {
    throw new ApiError("Lister profile id is required.", 422, "VALIDATION_ERROR")
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError("Rating must be between 1 and 5.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.post<unknown>(
    `/lister-reviews/${encodeURIComponent(normalizedListerProfileId)}`,
    {
      rating,
      tags,
      comment: comment?.trim() || null,
      relatedListingId: relatedListingId?.trim() || null,
      relatedBuildingId: relatedBuildingId?.trim() || null,
    },
  )

  return parseListerReviewMutationResponse(response.data)
}
