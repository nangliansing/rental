import { ApiError, apiClient } from "@/lib/api-client"

import type {
  ListerReview,
  ListerReviewModeration,
  ListerReviewMutationResult,
} from "@/features/lister-review/api/createListerReview"
import { parseListerReviewMutationResponse } from "@/features/lister-review/api/listerReviewResponseParsers"

export type DeleteAdminListerReviewInput = {
  reviewId: string
  reason: string
}

export type DeletedAdminListerReview = Omit<
  ListerReview,
  "deletedAt" | "isDeleted" | "moderation"
> & {
  deletedAt: string
  isDeleted: true
  moderation: Omit<
    ListerReviewModeration,
    "removedAt" | "removedBy" | "removedReason"
  > & {
    removedAt: string
    removedBy: string
    removedReason: string
  }
}

export type DeleteAdminListerReviewResult = Omit<
  ListerReviewMutationResult,
  "review"
> & {
  review: DeletedAdminListerReview
}

export type DeleteAdminListerReviewResponse = {
  success: true
  data: DeleteAdminListerReviewResult
}

const MAX_DELETE_REASON_LENGTH = 500
const INVALID_ADMIN_DELETE_LISTER_REVIEW_RESPONSE =
  "INVALID_ADMIN_DELETE_LISTER_REVIEW_RESPONSE"

function invalidDeleteResponse() {
  return new ApiError(
    "Could not confirm that the review was removed.",
    500,
    INVALID_ADMIN_DELETE_LISTER_REVIEW_RESPONSE,
  )
}

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isNonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 0
}

function hasValidReviewSummary(value: unknown) {
  const summary = readRecord(value)
  const ratingCounts = readRecord(summary?.ratingCounts)
  const averageRating = summary?.averageRating

  return Boolean(
    summary &&
      typeof averageRating === "number" &&
      Number.isFinite(averageRating) &&
      averageRating >= 0 &&
      averageRating <= 5 &&
      isNonNegativeInteger(summary.reviewCount) &&
      ratingCounts &&
      isNonNegativeInteger(ratingCounts.oneStar) &&
      isNonNegativeInteger(ratingCounts.twoStars) &&
      isNonNegativeInteger(ratingCounts.threeStars) &&
      isNonNegativeInteger(ratingCounts.fourStars) &&
      isNonNegativeInteger(ratingCounts.fiveStars) &&
      Array.isArray(summary.tagCounts),
  )
}

function normalizeDeleteInput({
  reviewId,
  reason,
}: DeleteAdminListerReviewInput) {
  const normalizedReviewId =
    typeof reviewId === "string" ? reviewId.trim() : ""

  if (!normalizedReviewId) {
    throw new ApiError(
      "Review id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  if (typeof reason !== "string") {
    throw new ApiError(
      "Removal reason must be a string.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const normalizedReason = reason.trim()

  if (!normalizedReason) {
    throw new ApiError(
      "Enter a reason for removing this review.",
      422,
      "VALIDATION_ERROR",
    )
  }

  if (normalizedReason.length > MAX_DELETE_REASON_LENGTH) {
    throw new ApiError(
      `Removal reason must be ${MAX_DELETE_REASON_LENGTH} characters or fewer.`,
      422,
      "VALIDATION_ERROR",
    )
  }

  return { normalizedReason, normalizedReviewId }
}

export function isAdminListerReviewNotFoundError(error: unknown) {
  return (
    error instanceof ApiError && error.code === "LISTER_REVIEW_NOT_FOUND"
  )
}

export function parseDeleteAdminListerReviewResponse(
  value: unknown,
  expectedReason?: string,
): DeleteAdminListerReviewResponse {
  const response = readRecord(value)
  const data = readRecord(response?.data)

  if (
    response?.success !== true ||
    !data ||
    !readRecord(data.review) ||
    !hasValidReviewSummary(data.reviewSummary)
  ) {
    throw invalidDeleteResponse()
  }

  let parsed: ListerReviewMutationResult

  try {
    parsed = parseListerReviewMutationResponse(value)
  } catch {
    throw invalidDeleteResponse()
  }

  const { moderation, deletedAt, isDeleted } = parsed.review

  if (
    isDeleted !== true ||
    !deletedAt ||
    !moderation.removedBy ||
    !moderation.removedAt ||
    !moderation.removedReason ||
    (expectedReason !== undefined &&
      moderation.removedReason !== expectedReason)
  ) {
    throw invalidDeleteResponse()
  }

  return {
    success: true,
    data: parsed as DeleteAdminListerReviewResult,
  }
}

export async function deleteAdminListerReview(
  input: DeleteAdminListerReviewInput,
): Promise<DeleteAdminListerReviewResult> {
  const { normalizedReason, normalizedReviewId } =
    normalizeDeleteInput(input)
  const response = await apiClient.delete<unknown>(
    `/admin/reviews/${encodeURIComponent(normalizedReviewId)}`,
    { reason: normalizedReason },
  )

  return parseDeleteAdminListerReviewResponse(
    response.data,
    normalizedReason,
  ).data
}
