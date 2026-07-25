import { ApiError } from "@/lib/api-client"

import {
  parsePagination,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type { Pagination } from "@/features/map-search/types"
import type { UploadedMedia } from "@/features/uploads"

import type {
  ListerReview,
  ListerReviewInteraction,
  ListerReviewModeration,
  ListerReviewMutationResult,
  ListerReviewReviewer,
  ListerReviewSummary,
  ListerReviewTag,
  ListerReviewVisibility,
} from "./createListerReview"

const INVALID_LISTER_REVIEW_RESPONSE = "INVALID_LISTER_REVIEW_RESPONSE"

const LISTER_REVIEW_TAGS = new Set<ListerReviewTag>([
  "RESPONSIVE",
  "HELPFUL",
  "ACCURATE_INFO",
  "FRIENDLY",
  "CLEAR_COMMUNICATION",
  "FAST_FOLLOW_UP",
  "UNRESPONSIVE",
  "INACCURATE_INFO",
  "RUDE",
  "SUSPICIOUS",
  "PRESSURE_TACTICS",
])

const parseReviewTags = (value: unknown): ListerReviewTag[] => {
  return readStringArray(value).filter((tag): tag is ListerReviewTag =>
    LISTER_REVIEW_TAGS.has(tag as ListerReviewTag),
  )
}

const parseUploadedMedia = (value: unknown): UploadedMedia | null => {
  if (value == null) return null

  const media = readRecord(value)
  const publicId = readString(media.publicId)
  const secureUrl = readString(media.secureUrl)

  if (!publicId || !secureUrl) return null

  return {
    publicId,
    secureUrl,
    resourceType: readString(media.resourceType, "image"),
    format: readNullableString(media.format),
    width: readNumber(media.width),
    height: readNumber(media.height),
    bytes: readNumber(media.bytes),
    position: readNumber(media.position, 0) ?? 0,
    alt: readNullableString(media.alt),
    isCover: readBoolean(media.isCover),
  }
}

const parseListerReviewInteraction = (
  value: unknown,
): ListerReviewInteraction => {
  const interaction = readRecord(value)

  return {
    isVerified: readBoolean(interaction.isVerified),
    verifiedBy:
      readString(interaction.verifiedBy) === "CONTACT_CLICK"
        ? "CONTACT_CLICK"
        : null,
    contactEventId: readNullableString(interaction.contactEventId),
    verifiedAt: readNullableString(interaction.verifiedAt),
  }
}

const parseListerReviewModeration = (
  value: unknown,
): ListerReviewModeration => {
  const moderation = readRecord(value)

  return {
    hiddenBy: readNullableString(moderation.hiddenBy),
    hiddenAt: readNullableString(moderation.hiddenAt),
    hiddenReason: readNullableString(moderation.hiddenReason),
    removedBy: readNullableString(moderation.removedBy),
    removedAt: readNullableString(moderation.removedAt),
    removedReason: readNullableString(moderation.removedReason),
  }
}

const parseListerReviewVisibility = (
  value: unknown,
): ListerReviewVisibility => {
  const visibility = readRecord(value)

  return {
    isCollapsed: readBoolean(visibility.isCollapsed),
    collapsedBy: readNullableString(visibility.collapsedBy),
    collapsedAt: readNullableString(visibility.collapsedAt),
    collapseReason: readNullableString(visibility.collapseReason),
  }
}

const parseListerReviewReviewer = (
  value: unknown,
): ListerReviewReviewer | undefined => {
  if (value == null) return undefined

  const reviewer = readRecord(value)
  const userId = readString(reviewer.userId)

  if (!userId) return undefined

  return {
    userId,
    name: readNullableString(reviewer.name),
    displayName: readNullableString(reviewer.displayName),
    profilePhoto: parseUploadedMedia(reviewer.profilePhoto),
    isVerified: readBoolean(reviewer.isVerified),
  }
}

export const parseListerReview = (value: unknown): ListerReview => {
  const review = readRecord(value)
  const id = readString(review._id)
  const reviewerId = readString(review.reviewerId)
  const listerProfileId = readString(review.listerProfileId)

  if (!id || !reviewerId || !listerProfileId) {
    throw new ApiError(
      "Lister review response is missing review data.",
      500,
      INVALID_LISTER_REVIEW_RESPONSE,
    )
  }

  return {
    _id: id,
    reviewerId,
    listerProfileId,
    relatedListingId: readNullableString(review.relatedListingId),
    relatedBuildingId: readNullableString(review.relatedBuildingId),
    rating: readNumber(review.rating, 0) ?? 0,
    tags: parseReviewTags(review.tags),
    comment: readNullableString(review.comment),
    interaction: parseListerReviewInteraction(review.interaction),
    moderation: parseListerReviewModeration(review.moderation),
    visibility: parseListerReviewVisibility(review.visibility),
    editedAt: readNullableString(review.editedAt),
    isDeleted: readBoolean(review.isDeleted),
    deletedAt: readNullableString(review.deletedAt),
    createdAt: readString(review.createdAt),
    updatedAt: readString(review.updatedAt),
    reviewer: parseListerReviewReviewer(review.reviewer),
  }
}

export const parseListerReviewSummary = (
  value: unknown,
): ListerReviewSummary => {
  const summary = readRecord(value)
  const ratingCounts = readRecord(summary.ratingCounts)

  return {
    averageRating: readNumber(summary.averageRating, 0) ?? 0,
    reviewCount: readNumber(summary.reviewCount, 0) ?? 0,
    ratingCounts: {
      oneStar: readNumber(ratingCounts.oneStar, 0) ?? 0,
      twoStars: readNumber(ratingCounts.twoStars, 0) ?? 0,
      threeStars: readNumber(ratingCounts.threeStars, 0) ?? 0,
      fourStars: readNumber(ratingCounts.fourStars, 0) ?? 0,
      fiveStars: readNumber(ratingCounts.fiveStars, 0) ?? 0,
    },
    tagCounts: Array.isArray(summary.tagCounts)
      ? summary.tagCounts.flatMap((tagCount) => {
          const tagCountRecord = readRecord(tagCount)
          const tag = readString(tagCountRecord.tag)

          if (!LISTER_REVIEW_TAGS.has(tag as ListerReviewTag)) return []

          return [
            {
              tag: tag as ListerReviewTag,
              count: readNumber(tagCountRecord.count, 0) ?? 0,
            },
          ]
        })
      : [],
  }
}

export const parseListerReviewMutationResponse = (
  value: unknown,
): ListerReviewMutationResult => {
  const response = readRecord(value)
  const data = readRecord(response.data)

  return {
    review: parseListerReview(data.review),
    reviewSummary: parseListerReviewSummary(data.reviewSummary),
  }
}

export const parseListerReviewResponse = (value: unknown): ListerReview => {
  const response = readRecord(value)

  return parseListerReview(response.data)
}

export const parseSearchListerReviewsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): {
  success: true
  data: {
    myReview: ListerReview | null
    reviews: ListerReview[]
  }
  pagination: Pagination
} => {
  const response = readRecord(value)
  const data = readRecord(response.data)

  return {
    success: true,
    data: {
      myReview: data.myReview ? parseListerReview(data.myReview) : null,
      reviews: Array.isArray(data.reviews)
        ? data.reviews.map(parseListerReview)
        : [],
    },
    pagination: parsePagination(response.pagination, fallback),
  }
}
