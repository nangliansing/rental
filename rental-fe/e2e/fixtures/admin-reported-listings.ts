import type { Page, Route } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAuthUser,
} from "./authenticated-session"
import { smokeListingBuilding } from "./lister-onboarding"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

type AdminReportMock = {
  _id: string
  targetType: "LISTING"
  listingId: string
  reportedBy: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  reason: "MISLEADING_PHOTOS"
  note: string | null
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN"
  reviewedBy: typeof smokeAuthUser | null
  reviewedAt: string | null
  reviewNote: string | null
  listing: {
    _id: string
    visibility: "PUBLIC"
    rent: number
    deposit: number
    moveInCost: number
    bedroomCount: number
    bathroomCount: number
    kitchenType: string
    size: number | null
    contractMonths: number
    occupancy: number
    media: Array<{
      publicId: string
      secureUrl: string
      resourceType: string
      position: number
      alt: string
      isCover: boolean
    }>
    description: string
    isDeleted: boolean
    listedBy: string
    buildingId: string
    createdAt: string
    updatedAt: string
  }
  listingOwner: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  listingAgentProfile: {
    _id: string
    userId: string
    displayName: string
    profilePhoto: null
    phone: string | null
    lineUrl: string | null
    whatsappPhone: string | null
    telegramUrl: string | null
    viberPhone: string | null
    supportLanguages: string[]
    isOnline: boolean
    isVerified: boolean
  }
  building: {
    _id: string
    name: string
    buildingType: string
    address: string
    location: {
      type: "Point"
      coordinates: [number, number]
    }
    isActive: boolean
  }
  createdAt: string
  updatedAt: string
}

const adminReportsListUrl = /\/api\/v1\/admin\/reports(?:\?|$)/
const adminReportDetailUrl = /\/api\/v1\/admin\/reports\/[^/?]+$/
const adminReportStatusMutationUrl =
  /\/api\/v1\/admin\/reports\/[^/]+\/status$/
const adminListingDeleteUrl = /\/api\/v1\/admin\/listings\/[^/?]+$/

export const adminReportReasonLabel = "Misleading photos"
export const adminReportBuildingName = smokeListingBuilding.name
export const adminReportNote =
  "Photos do not match the actual room layout."

function buildAdminReportListing() {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "listing-report-smoke-1",
    visibility: "PUBLIC" as const,
    rent: 15000,
    deposit: 30000,
    moveInCost: 45000,
    bedroomCount: 1,
    bathroomCount: 1,
    kitchenType: "NONE",
    size: null,
    contractMonths: 12,
    occupancy: 1,
    media: [
      {
        publicId: "test/report-cover",
        secureUrl: "https://example.com/report-listing.jpg",
        resourceType: "image",
        position: 0,
        alt: "Reported room",
        isCover: true,
      },
    ],
    description: "Bright room with misleading photos",
    isDeleted: false,
    listedBy: "user-lister-smoke-1",
    buildingId: smokeListingBuilding._id,
    createdAt: now,
    updatedAt: now,
  }
}

function buildAdminReport(): AdminReportMock {
  const now = "2026-07-25T08:00:00.000Z"
  const listing = buildAdminReportListing()

  return {
    _id: "report-admin-smoke-1",
    targetType: "LISTING",
    listingId: listing._id,
    reportedBy: {
      _id: "user-renter-smoke-1",
      name: "Alex Renter",
      email: "alex@example.com",
      role: "USER",
      status: "ACTIVE",
    },
    reason: "MISLEADING_PHOTOS",
    note: adminReportNote,
    status: "OPEN",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    listing,
    listingOwner: {
      _id: "user-lister-smoke-1",
      name: "Jessie Lister",
      email: "jessie@example.com",
      role: "USER",
      status: "ACTIVE",
    },
    listingAgentProfile: {
      _id: "agent-lister-smoke-1",
      userId: "user-lister-smoke-1",
      displayName: "Jessie Lister",
      profilePhoto: null,
      phone: "0812345678",
      lineUrl: null,
      whatsappPhone: null,
      telegramUrl: null,
      viberPhone: null,
      supportLanguages: ["English"],
      isOnline: true,
      isVerified: false,
    },
    building: {
      _id: smokeListingBuilding._id,
      name: smokeListingBuilding.name,
      buildingType: smokeListingBuilding.buildingType,
      address: smokeListingBuilding.address,
      location: smokeListingBuilding.location,
      isActive: true,
    },
    createdAt: now,
    updatedAt: now,
  }
}

function readJsonBody(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown> | null
  } catch {
    return null
  }
}

export async function installAdminReportedListingsMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let reports: AdminReportMock[] = [buildAdminReport()]

  const findReport = (reportId: string) =>
    reports.find((report) => report._id === reportId)

  const handleReportStatusMutation = async (route: Route) => {
    const url = new URL(route.request().url())
    const reportId = url.pathname.split("/").at(-2)
    const currentReport = reportId ? findReport(reportId) : undefined
    const body = readJsonBody(route)
    const nextStatus = body?.status

    if (
      !reportId ||
      !currentReport ||
      typeof nextStatus !== "string" ||
      nextStatus === "OPEN"
    ) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "REPORT_NOT_FOUND",
            message: "Report not found",
          },
          404,
        ),
      )
      return
    }

    const reviewedAt = "2026-07-25T09:00:00.000Z"
    const reviewNote =
      typeof body.reviewNote === "string" ? body.reviewNote : null
    const updatedReport: AdminReportMock = {
      ...currentReport,
      status: nextStatus as AdminReportMock["status"],
      reviewNote,
      reviewedBy: smokeAuthUser,
      reviewedAt,
      updatedAt: reviewedAt,
    }

    reports = reports.map((report) =>
      report._id === reportId ? updatedReport : report,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: updatedReport,
      }),
    )
  }

  const handleListingDelete = async (route: Route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const listingId = url.pathname.split("/").pop()
    const body = readJsonBody(route)
    const reason = typeof body?.reason === "string" ? body.reason : ""
    const currentReport = reports.find(
      (report) => report.listing?._id === listingId,
    )

    if (!listingId || !currentReport?.listing || !reason) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "LISTING_NOT_FOUND",
            message: "Listing not found",
          },
          404,
        ),
      )
      return
    }

    const deletedListing = {
      ...currentReport.listing,
      isDeleted: true,
      visibility: "PRIVATE" as const,
      updatedAt: "2026-07-25T09:00:00.000Z",
    }
    const updatedReport: AdminReportMock = {
      ...currentReport,
      listing: deletedListing,
      updatedAt: deletedListing.updatedAt,
    }

    reports = reports.map((report) =>
      report._id === currentReport._id ? updatedReport : report,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: deletedListing,
      }),
    )
  }

  const handleReportsList = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const status = url.searchParams.get("status")
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")
    const filteredReports =
      status && status !== "all"
        ? reports.filter((report) => report.status === status)
        : reports

    await route.fulfill(
      jsonRoute({
        success: true,
        data: filteredReports,
        pagination: {
          page: pageNumber,
          limit,
          total: filteredReports.length,
        },
      }),
    )
  }

  const handleReportDetail = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const reportId = url.pathname.split("/").pop()
    const currentReport = reportId ? findReport(reportId) : undefined

    if (!currentReport) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "REPORT_NOT_FOUND",
            message: "Report not found",
          },
          404,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: currentReport,
      }),
    )
  }

  await page.route(adminReportStatusMutationUrl, handleReportStatusMutation)
  await page.route(adminListingDeleteUrl, handleListingDelete)
  await page.route(adminReportsListUrl, handleReportsList)
  await page.route(adminReportDetailUrl, handleReportDetail)
}
