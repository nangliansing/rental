import type { Page, Route } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAuthUser,
} from "./authenticated-session"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

type AdminReviewReportMock = {
  _id: string
  reviewId: string
  listerProfileId: string
  reviewOwnerId: string
  reason: "INAPPROPRIATE_LANGUAGE"
  note: string | null
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN"
  reviewedBy: typeof smokeAuthUser | null
  reviewedAt: string | null
  reviewNote: string | null
  actionTakenBy: typeof smokeAuthUser | null
  actionTakenAt: string | null
  actionReason: string | null
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  reportedBy: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  reviewOwner: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  listerProfile: {
    _id: string
    userId: string
    displayName: string
    profilePhoto: null
    supportLanguages: string[]
    isOnline: boolean
    isDeleted: boolean
    isVerified: boolean
    reviewSummary: {
      averageRating: number
      reviewCount: number
      ratingCounts: {
        oneStar: number
        twoStars: number
        threeStars: number
        fourStars: number
        fiveStars: number
      }
      tagCounts: []
    }
  }
  review: {
    _id: string
    reviewerId: string
    listerProfileId: string
    relatedListingId: string | null
    relatedBuildingId: string | null
    rating: number
    tags: string[]
    comment: string
    interaction: {
      isVerified: boolean
      verifiedBy: string | null
      contactEventId: string | null
      verifiedAt: string | null
    }
    moderation: {
      hiddenBy: string | null
      hiddenAt: string | null
      hiddenReason: string | null
      removedBy: string | null
      removedAt: string | null
      removedReason: string | null
    }
    visibility: {
      isCollapsed: boolean
      collapsedBy: string | null
      collapsedAt: string | null
      collapseReason: string | null
    }
    editedAt: string | null
    isDeleted: boolean
    deletedAt: string | null
    createdAt: string
    updatedAt: string
    reviewer: {
      userId: string
      name: string
      displayName: string | null
      profilePhoto: null
      isVerified: boolean
    }
  }
}

const adminReviewReportsListUrl = /\/api\/v1\/admin\/review-reports(?:\?|$)/
const adminReviewReportDetailUrl = /\/api\/v1\/admin\/review-reports\/[^/?]+$/
const adminReviewReportStatusMutationUrl =
  /\/api\/v1\/admin\/review-reports\/[^/]+\/status$/
const adminListerReviewDeleteUrl = /\/api\/v1\/admin\/reviews\/[^/?]+$/

export const adminReviewReportReasonLabel = "Inappropriate language"
export const adminReviewReportNote =
  "Contains abusive language toward the lister."
export const adminReviewReportComment =
  "This lister was extremely rude during the visit."

function buildReviewSummary() {
  return {
    averageRating: 2,
    reviewCount: 1,
    ratingCounts: {
      oneStar: 0,
      twoStars: 1,
      threeStars: 0,
      fourStars: 0,
      fiveStars: 0,
    },
    tagCounts: [] as [],
  }
}

function buildListerReview(isDeleted = false, removedReason?: string) {
  const now = "2026-07-25T08:00:00.000Z"
  const removedAt = "2026-07-25T09:00:00.000Z"

  return {
    _id: "lister-review-smoke-1",
    reviewerId: "user-renter-smoke-1",
    listerProfileId: "agent-lister-smoke-1",
    relatedListingId: null,
    relatedBuildingId: null,
    rating: 2,
    tags: ["RUDE"],
    comment: adminReviewReportComment,
    interaction: {
      isVerified: false,
      verifiedBy: null,
      contactEventId: null,
      verifiedAt: null,
    },
    moderation: {
      hiddenBy: null,
      hiddenAt: null,
      hiddenReason: null,
      removedBy: isDeleted ? smokeAuthUser._id : null,
      removedAt: isDeleted ? removedAt : null,
      removedReason: isDeleted ? removedReason ?? null : null,
    },
    visibility: {
      isCollapsed: false,
      collapsedBy: null,
      collapsedAt: null,
      collapseReason: null,
    },
    editedAt: null,
    isDeleted,
    deletedAt: isDeleted ? removedAt : null,
    createdAt: now,
    updatedAt: isDeleted ? removedAt : now,
    reviewer: {
      userId: "user-renter-smoke-1",
      name: "Alex Renter",
      displayName: null,
      profilePhoto: null,
      isVerified: false,
    },
  }
}

function buildAdminReviewReport(): AdminReviewReportMock {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "review-report-admin-smoke-1",
    reviewId: "lister-review-smoke-1",
    listerProfileId: "agent-lister-smoke-1",
    reviewOwnerId: "user-renter-smoke-1",
    reason: "INAPPROPRIATE_LANGUAGE",
    note: adminReviewReportNote,
    status: "OPEN",
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    actionTakenBy: null,
    actionTakenAt: null,
    actionReason: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    reportedBy: {
      _id: "user-reporting-smoke-1",
      name: "Sam Reporter",
      email: "sam@example.com",
      role: "USER",
      status: "ACTIVE",
    },
    reviewOwner: {
      _id: "user-renter-smoke-1",
      name: "Alex Renter",
      email: "alex@example.com",
      role: "USER",
      status: "ACTIVE",
    },
    listerProfile: {
      _id: "agent-lister-smoke-1",
      userId: "user-lister-smoke-1",
      displayName: "Jessie Lister",
      profilePhoto: null,
      supportLanguages: ["English"],
      isOnline: true,
      isDeleted: false,
      isVerified: false,
      reviewSummary: buildReviewSummary(),
    },
    review: buildListerReview(),
  }
}

function buildDeleteReviewResponse(reason: string) {
  return {
    success: true,
    data: {
      review: buildListerReview(true, reason),
      reviewSummary: buildReviewSummary(),
    },
  }
}

function readJsonBody(route: Route) {
  try {
    return route.request().postDataJSON() as Record<string, unknown> | null
  } catch {
    return null
  }
}

export async function installAdminReportedReviewsMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let reviewReports: AdminReviewReportMock[] = [buildAdminReviewReport()]

  const findReport = (reportId: string) =>
    reviewReports.find((report) => report._id === reportId)

  const handleReviewReportStatusMutation = async (route: Route) => {
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
            code: "REVIEW_REPORT_NOT_FOUND",
            message: "Review report not found",
          },
          404,
        ),
      )
      return
    }

    const reviewedAt = "2026-07-25T09:00:00.000Z"
    const reviewNote =
      typeof body.reviewNote === "string" ? body.reviewNote : null
    const updatedReport: AdminReviewReportMock = {
      ...currentReport,
      status: nextStatus as AdminReviewReportMock["status"],
      reviewNote,
      reviewedBy: smokeAuthUser,
      reviewedAt,
      updatedAt: reviewedAt,
    }

    reviewReports = reviewReports.map((report) =>
      report._id === reportId ? updatedReport : report,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: updatedReport,
      }),
    )
  }

  const handleListerReviewDelete = async (route: Route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const reviewId = url.pathname.split("/").pop()
    const body = readJsonBody(route)
    const reason = typeof body?.reason === "string" ? body.reason : ""
    const currentReport = reviewReports.find(
      (report) => report.review?._id === reviewId,
    )

    if (!reviewId || !currentReport?.review || !reason) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "LISTER_REVIEW_NOT_FOUND",
            message: "Review not found",
          },
          404,
        ),
      )
      return
    }

    const deletedReview = buildListerReview(true, reason)
    const updatedReport: AdminReviewReportMock = {
      ...currentReport,
      review: deletedReview,
      updatedAt: deletedReview.updatedAt,
    }

    reviewReports = reviewReports.map((report) =>
      report._id === currentReport._id ? updatedReport : report,
    )

    await route.fulfill(jsonRoute(buildDeleteReviewResponse(reason)))
  }

  const handleReviewReportsList = async (route: Route) => {
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
        ? reviewReports.filter((report) => report.status === status)
        : reviewReports

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

  const handleReviewReportDetail = async (route: Route) => {
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
            code: "REVIEW_REPORT_NOT_FOUND",
            message: "Review report not found",
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

  await page.route(
    adminReviewReportStatusMutationUrl,
    handleReviewReportStatusMutation,
  )
  await page.route(adminListerReviewDeleteUrl, handleListerReviewDelete)
  await page.route(adminReviewReportsListUrl, handleReviewReportsList)
  await page.route(adminReviewReportDetailUrl, handleReviewReportDetail)
}
