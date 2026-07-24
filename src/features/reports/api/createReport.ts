import { ApiError, apiClient } from "@/lib/api-client"

export type ReportReason =
  | "WRONG_PRICE"
  | "UNAVAILABLE"
  | "MISLEADING_PHOTOS"
  | "WRONG_BUILDING_OR_LOCATION"
  | "SUSPICIOUS_CONTACT"
  | "UNRESPONSIVE_LISTER"
  | "FAKE_OR_SUSPICIOUS_LISTER"
  | "DUPLICATE_LISTING"
  | "INAPPROPRIATE_CONTENT"
  | "UNAUTHORIZED_PHOTOS"
  | "HATE_OR_HARASSMENT"
  | "OTHER"

export type ReportStatus =
  | "OPEN"
  | "REVIEWED"
  | "DISMISSED"
  | "ACTION_TAKEN"

export type ReportTargetType = "LISTING"

export type CreateReportInput = {
  listingId: string
  reason: ReportReason
  note?: string | null
}

export type Report = {
  _id: string
  targetType: ReportTargetType
  listingId: string
  reportedBy: string
  reason: ReportReason
  note: string | null
  status: ReportStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

type CreateReportResponse = {
  success: true
  data: Report
}

const INVALID_CREATE_REPORT_RESPONSE = "INVALID_CREATE_REPORT_RESPONSE"

const reportReasons = new Set<ReportReason>([
  "WRONG_PRICE",
  "UNAVAILABLE",
  "MISLEADING_PHOTOS",
  "WRONG_BUILDING_OR_LOCATION",
  "SUSPICIOUS_CONTACT",
  "UNRESPONSIVE_LISTER",
  "FAKE_OR_SUSPICIOUS_LISTER",
  "DUPLICATE_LISTING",
  "INAPPROPRIATE_CONTENT",
  "UNAUTHORIZED_PHOTOS",
  "HATE_OR_HARASSMENT",
  "OTHER",
])

const reportStatuses = new Set<ReportStatus>([
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

function parseReport(value: unknown): Report {
  const report = readRecord(value)

  if (
    !report ||
    typeof report._id !== "string" ||
    report.targetType !== "LISTING" ||
    typeof report.listingId !== "string" ||
    typeof report.reportedBy !== "string" ||
    typeof report.reason !== "string" ||
    !reportReasons.has(report.reason as ReportReason) ||
    !isNullableString(report.note) ||
    typeof report.status !== "string" ||
    !reportStatuses.has(report.status as ReportStatus) ||
    !isNullableString(report.reviewedBy) ||
    !isNullableString(report.reviewedAt) ||
    !isNullableString(report.reviewNote) ||
    typeof report.createdAt !== "string" ||
    typeof report.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Could not read report response.",
      500,
      INVALID_CREATE_REPORT_RESPONSE,
    )
  }

  return report as Report
}

function parseCreateReportResponse(value: unknown) {
  const response = readRecord(value)

  if (!response || response.success !== true || !("data" in response)) {
    throw new ApiError(
      "Could not read report response.",
      500,
      INVALID_CREATE_REPORT_RESPONSE,
    )
  }

  return parseReport(response.data)
}

export async function createReport(input: CreateReportInput) {
  const listingId = input.listingId.trim()
  const note = input.note?.trim()

  if (!listingId) {
    throw new ApiError("Listing id is required.", 422, "VALIDATION_ERROR")
  }
  if (!reportReasons.has(input.reason)) {
    throw new ApiError("Report reason is invalid.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.post<CreateReportResponse>("/reports", {
    listingId,
    reason: input.reason,
    ...(note ? { note } : {}),
  })

  return parseCreateReportResponse(response.data)
}
