import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"
import {
  normalizePositiveInteger,
  parseBuildingLocation,
  parsePagination,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@/features/reports/api"
import type { UploadedMedia } from "@/features/uploads"

export type AdminReportStatusFilter = ReportStatus

export type AdminReportUser = Pick<
  AuthUser,
  "_id" | "name" | "email" | "role" | "status"
>

export type AdminReportAgentProfile = {
  _id: string
  userId: string
  displayName: string | null
  profilePhoto: UploadedMedia | null
  phone: string | null
  lineUrl: string | null
  whatsappPhone: string | null
  telegramUrl: string | null
  viberPhone: string | null
  supportLanguages: string[]
  isOnline: boolean
  isDeleted?: boolean
  isVerified: boolean
}

export type AdminReportListing = {
  _id: string
  visibility: "PUBLIC" | "PRIVATE"
  rent: number
  deposit: number
  moveInCost: number
  bedroomCount: number
  bathroomCount: number
  kitchenType: string
  size: number | null
  contractMonths: number
  occupancy: number
  media: UploadedMedia[]
  description: string | null
  isDeleted: boolean
  listedBy: string
  buildingId: string
  createdAt: string
  updatedAt: string
}

export type AdminReportBuilding = {
  _id: string
  name: string
  buildingType: string
  address: string | null
  location: {
    type: "Point"
    coordinates: [number, number]
  }
  isActive: boolean
}

export type AdminReport = {
  _id: string
  targetType: ReportTargetType
  listingId: string
  reportedBy: AdminReportUser
  reason: ReportReason
  note: string | null
  status: ReportStatus
  reviewedBy: AdminReportUser | null
  reviewedAt: string | null
  reviewNote: string | null
  listing?: AdminReportListing
  listingOwner?: AdminReportUser
  listingAgentProfile?: AdminReportAgentProfile
  building?: AdminReportBuilding
  createdAt: string
  updatedAt: string
}

export type AdminReportsPagination = {
  page: number
  limit: number
  total: number
}

export type SearchAdminReportsInput = {
  status?: AdminReportStatusFilter
  page?: number
  limit?: number
}

export type SearchAdminReportsResponse = {
  success: true
  data: AdminReport[]
  pagination: AdminReportsPagination
}

const INVALID_ADMIN_REPORT_RESPONSE = "INVALID_ADMIN_REPORT_RESPONSE"

const REPORT_REASONS = new Set<ReportReason>([
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

const REPORT_STATUSES = new Set<ReportStatus>([
  "OPEN",
  "REVIEWED",
  "DISMISSED",
  "ACTION_TAKEN",
])

const parseReportReason = (value: unknown): ReportReason => {
  const reason = readString(value)

  if (!REPORT_REASONS.has(reason as ReportReason)) {
    throw new ApiError(
      "Admin report response has an invalid reason.",
      500,
      INVALID_ADMIN_REPORT_RESPONSE,
    )
  }

  return reason as ReportReason
}

const parseReportStatus = (value: unknown): ReportStatus => {
  const status = readString(value)

  if (!REPORT_STATUSES.has(status as ReportStatus)) {
    throw new ApiError(
      "Admin report response has an invalid status.",
      500,
      INVALID_ADMIN_REPORT_RESPONSE,
    )
  }

  return status as ReportStatus
}

const parseAdminReportUser = (
  value: unknown,
  fallbackName = "Unknown user",
): AdminReportUser => {
  const user = readRecord(value)
  const id = readString(user._id)

  return {
    _id: id,
    name: readString(user.name, fallbackName),
    email: readString(user.email),
    role: readString(user.role, "USER") as AdminReportUser["role"],
    status: readString(user.status, "ACTIVE") as AdminReportUser["status"],
  }
}

const parseOptionalAdminReportUser = (
  value: unknown,
): AdminReportUser | undefined => {
  const user = readRecord(value)
  const id = readString(user._id)

  if (!id) return undefined

  return parseAdminReportUser(value)
}

const parseReviewedBy = (value: unknown): AdminReportUser | null => {
  const user = readRecord(value)
  const id = readString(user._id)

  if (!id) return null

  return parseAdminReportUser(value)
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

const parseAdminReportAgentProfile = (
  value: unknown,
): AdminReportAgentProfile | undefined => {
  const profile = readRecord(value)
  const id = readString(profile._id)
  const userId = readString(profile.userId)

  if (!id || !userId) return undefined

  return {
    _id: id,
    userId,
    displayName: readNullableString(profile.displayName),
    profilePhoto: parseUploadedMedia(profile.profilePhoto),
    phone: readNullableString(profile.phone),
    lineUrl: readNullableString(profile.lineUrl),
    whatsappPhone: readNullableString(profile.whatsappPhone),
    telegramUrl: readNullableString(profile.telegramUrl),
    viberPhone: readNullableString(profile.viberPhone),
    supportLanguages: readStringArray(profile.supportLanguages),
    isOnline: readBoolean(profile.isOnline),
    isDeleted: readBoolean(profile.isDeleted),
    isVerified: readBoolean(profile.isVerified),
  }
}

export const parseAdminReportListing = (
  value: unknown,
): AdminReportListing | undefined => {
  const listing = readRecord(value)
  const id = readString(listing._id)
  const listedBy = readString(listing.listedBy)
  const buildingId = readString(listing.buildingId)

  if (!id || !listedBy || !buildingId) return undefined

  const visibility = readString(listing.visibility, "PUBLIC")

  return {
    _id: id,
    visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    rent: readNumber(listing.rent, 0) ?? 0,
    deposit: readNumber(listing.deposit, 0) ?? 0,
    moveInCost: readNumber(listing.moveInCost, 0) ?? 0,
    bedroomCount: readNumber(listing.bedroomCount, 0) ?? 0,
    bathroomCount: readNumber(listing.bathroomCount, 0) ?? 0,
    kitchenType: readString(listing.kitchenType),
    size: readNumber(listing.size),
    contractMonths: readNumber(listing.contractMonths, 0) ?? 0,
    occupancy: readNumber(listing.occupancy, 0) ?? 0,
    media: Array.isArray(listing.media)
      ? listing.media.flatMap((media) => {
          const parsedMedia = parseUploadedMedia(media)

          return parsedMedia ? [parsedMedia] : []
        })
      : [],
    description: readNullableString(listing.description),
    isDeleted: readBoolean(listing.isDeleted),
    listedBy,
    buildingId,
    createdAt: readString(listing.createdAt),
    updatedAt: readString(listing.updatedAt),
  }
}

const parseAdminReportBuilding = (
  value: unknown,
): AdminReportBuilding | undefined => {
  const building = readRecord(value)
  const id = readString(building._id)

  if (!id) return undefined

  return {
    _id: id,
    name: readString(building.name),
    buildingType: readString(building.buildingType),
    address: readNullableString(building.address),
    location: parseBuildingLocation(building.location),
    isActive: readBoolean(building.isActive),
  }
}

export const parseAdminReport = (value: unknown): AdminReport => {
  const report = readRecord(value)
  const id = readString(report._id)
  const listingId = readString(report.listingId)

  if (!id || !listingId || report.targetType !== "LISTING") {
    throw new ApiError(
      "Admin report response is missing report data.",
      500,
      INVALID_ADMIN_REPORT_RESPONSE,
    )
  }

  return {
    _id: id,
    targetType: "LISTING",
    listingId,
    reportedBy: parseAdminReportUser(report.reportedBy, "Unknown reporter"),
    reason: parseReportReason(report.reason),
    note: readNullableString(report.note),
    status: parseReportStatus(report.status),
    reviewedBy: parseReviewedBy(report.reviewedBy),
    reviewedAt: readNullableString(report.reviewedAt),
    reviewNote: readNullableString(report.reviewNote),
    listing: parseAdminReportListing(report.listing),
    listingOwner: parseOptionalAdminReportUser(report.listingOwner),
    listingAgentProfile: parseAdminReportAgentProfile(
      report.listingAgentProfile,
    ),
    building: parseAdminReportBuilding(report.building),
    createdAt: readString(report.createdAt),
    updatedAt: readString(report.updatedAt),
  }
}

export const parseSearchAdminReportsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchAdminReportsResponse => {
  const response = readRecord(value)
  const data = Array.isArray(response.data)
    ? response.data.map(parseAdminReport)
    : []

  return {
    success: true,
    data,
    pagination: parsePagination(response.pagination, fallback),
  }
}

export async function searchAdminReports({
  status,
  page = 1,
  limit = 20,
}: SearchAdminReportsInput = {}) {
  const normalizedPage = normalizePositiveInteger(page, 1)
  const normalizedLimit = normalizePositiveInteger(limit, 20)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  if (status) {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<SearchAdminReportsResponse>(
    `/admin/reports?${searchParams.toString()}`,
  )

  return parseSearchAdminReportsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
