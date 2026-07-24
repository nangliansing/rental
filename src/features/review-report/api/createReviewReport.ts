import { ApiError, apiClient } from "@/lib/api-client"

export type ReviewReportReason =
  | "INAPPROPRIATE_LANGUAGE"
  | "HARASSMENT_OR_HATE"
  | "FALSE_INFORMATION"
  | "SPAM"
  | "PRIVATE_INFORMATION"
  | "CONFLICT_OF_INTEREST"
  | "OTHER"

export type ReviewReportStatus =
  | "OPEN"
  | "REVIEWED"
  | "DISMISSED"
  | "ACTION_TAKEN"

export type CreateReviewReportInput = {
  reviewId: string
  reason: ReviewReportReason
  note?: string | null
}

export type ReviewReport = {
  _id: string
  reviewId: string
  listerProfileId: string
  reviewOwnerId: string
  reportedBy: string
  reason: ReviewReportReason
  note: string | null
  status: ReviewReportStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  actionTakenBy: string | null
  actionTakenAt: string | null
  actionReason: string | null
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

const INVALID_CREATE_REVIEW_REPORT_RESPONSE =
  "INVALID_CREATE_REVIEW_REPORT_RESPONSE"

const reviewReportReasons = new Set<ReviewReportReason>([
  "INAPPROPRIATE_LANGUAGE",
  "HARASSMENT_OR_HATE",
  "FALSE_INFORMATION",
  "SPAM",
  "PRIVATE_INFORMATION",
  "CONFLICT_OF_INTEREST",
  "OTHER",
])

const reviewReportStatuses = new Set<ReviewReportStatus>([
  "OPEN",
  "REVIEWED",
  "DISMISSED",
  "ACTION_TAKEN",
])

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function parseReviewReport(value: unknown): ReviewReport {
  const report = readRecord(value)
  if (
    !report ||
    typeof report._id !== "string" ||
    typeof report.reviewId !== "string" ||
    typeof report.listerProfileId !== "string" ||
    typeof report.reviewOwnerId !== "string" ||
    typeof report.reportedBy !== "string" ||
    typeof report.reason !== "string" ||
    !reviewReportReasons.has(report.reason as ReviewReportReason) ||
    !isNullableString(report.note) ||
    typeof report.status !== "string" ||
    !reviewReportStatuses.has(report.status as ReviewReportStatus) ||
    !isNullableString(report.reviewedBy) ||
    !isNullableString(report.reviewedAt) ||
    !isNullableString(report.reviewNote) ||
    !isNullableString(report.actionTakenBy) ||
    !isNullableString(report.actionTakenAt) ||
    !isNullableString(report.actionReason) ||
    typeof report.isDeleted !== "boolean" ||
    !isNullableString(report.deletedAt) ||
    typeof report.createdAt !== "string" ||
    typeof report.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Could not read review report response.",
      500,
      INVALID_CREATE_REVIEW_REPORT_RESPONSE,
    )
  }
  return report as ReviewReport
}

function parseCreateReviewReportResponse(value: unknown) {
  const response = readRecord(value)
  if (!response || response.success !== true) {
    throw new ApiError(
      "Could not read review report response.",
      500,
      INVALID_CREATE_REVIEW_REPORT_RESPONSE,
    )
  }
  return parseReviewReport(response.data)
}

export async function createReviewReport(input: CreateReviewReportInput) {
  const reviewId = input.reviewId.trim()
  const note = input.note?.trim()

  if (!reviewId) {
    throw new ApiError("Review id is required.", 422, "VALIDATION_ERROR")
  }
  if (!reviewReportReasons.has(input.reason)) {
    throw new ApiError("Review report reason is invalid.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.post<unknown>(
    "/review-reports",
    {
      reviewId,
      reason: input.reason,
      ...(note ? { note } : {}),
    },
  )

  return parseCreateReviewReportResponse(response.data)
}
