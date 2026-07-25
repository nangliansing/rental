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

type AdminBuildingEditRequestMock = {
  _id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  buildingId: string
  building: null | {
    _id: string
    name: string
    buildingType: string
    facilities: string[]
    security: string[]
    location: {
      type: "Point"
      coordinates: [number, number]
    }
    address: string
    isActive: boolean
    minRent: number
    maxRent: number
  }
  requestedBy: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  agentProfile: {
    _id: string
    userId: string
    displayName: string
    isOnline: boolean
    profilePhoto: null
    phone: string | null
    lineUrl: string | null
    whatsappPhone: string | null
    telegramUrl: string | null
    viberPhone: string | null
    supportLanguages: string[]
    isVerified: boolean
  } | null
  requestReason: string | null
  originalBuilding: {
    name: string
    buildingType: string
    facilities: string[]
    security: string[]
    location: {
      type: "Point"
      coordinates: [number, number]
    }
    address: string
  }
  proposedBuilding: {
    name: string
    buildingType: string
    facilities: string[]
    security: string[]
    location: {
      type: "Point"
      coordinates: [number, number]
    }
    address: string
  }
  reviewedBy: typeof smokeAuthUser | null
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
}

const adminBuildingEditRequestsListUrl =
  /\/api\/v1\/admin\/building-edit-requests(?:\?|$)/
const adminBuildingEditRequestDetailUrl =
  /\/api\/v1\/admin\/building-edit-requests\/[^/?]+$/
const adminBuildingEditRequestMutationUrl =
  /\/api\/v1\/admin\/building-edit-requests\/[^/]+\/(approve|reject)$/

export const adminBuildingEditOriginalName = smokeListingBuilding.name
export const adminBuildingEditProposedName = "Bangkapi Tower"
export const adminBuildingEditDiffTitle = `${adminBuildingEditOriginalName} → ${adminBuildingEditProposedName}`

function buildOriginalBuildingSnapshot() {
  return {
    name: smokeListingBuilding.name,
    buildingType: smokeListingBuilding.buildingType,
    facilities: smokeListingBuilding.facilities,
    security: smokeListingBuilding.security,
    location: smokeListingBuilding.location,
    address: smokeListingBuilding.address,
  }
}

function buildProposedBuildingSnapshot() {
  return {
    name: adminBuildingEditProposedName,
    buildingType: smokeListingBuilding.buildingType,
    facilities: [...smokeListingBuilding.facilities, "Pool"],
    security: smokeListingBuilding.security,
    location: smokeListingBuilding.location,
    address: "Bang Kapi, Bangkok (updated pin)",
  }
}

function buildApprovedBuilding() {
  const proposed = buildProposedBuildingSnapshot()

  return {
    _id: smokeListingBuilding._id,
    ...proposed,
    isActive: true,
    minRent: smokeListingBuilding.minRent,
    maxRent: smokeListingBuilding.maxRent,
  }
}

function buildAdminBuildingEditRequest(): AdminBuildingEditRequestMock {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "building-edit-admin-smoke-1",
    status: "PENDING",
    buildingId: smokeListingBuilding._id,
    building: null,
    requestedBy: {
      _id: "user-lister-smoke-1",
      name: "Jessie Lister",
      email: "jessie@example.com",
      role: "USER",
      status: "ACTIVE",
    },
    agentProfile: {
      _id: "agent-lister-smoke-1",
      userId: "user-lister-smoke-1",
      displayName: "Jessie Lister",
      isOnline: true,
      profilePhoto: null,
      phone: "0812345678",
      lineUrl: null,
      whatsappPhone: null,
      telegramUrl: null,
      viberPhone: null,
      supportLanguages: ["English"],
      isVerified: false,
    },
    requestReason: "Correct building name and facilities after on-site visit.",
    originalBuilding: buildOriginalBuildingSnapshot(),
    proposedBuilding: buildProposedBuildingSnapshot(),
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    createdAt: now,
    updatedAt: now,
  }
}

function readReviewReason(route: Route) {
  try {
    const body = route.request().postDataJSON() as {
      reviewReason?: string
    } | null
    return typeof body?.reviewReason === "string" ? body.reviewReason : ""
  } catch {
    return ""
  }
}

export async function installAdminBuildingEditMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let buildingEditRequests: AdminBuildingEditRequestMock[] = [
    buildAdminBuildingEditRequest(),
  ]

  const findRequest = (requestId: string) =>
    buildingEditRequests.find((request) => request._id === requestId)

  const handleBuildingEditRequestMutation = async (route: Route) => {
    const url = new URL(route.request().url())
    const mutationMatch = url.pathname.match(
      /\/admin\/building-edit-requests\/([^/]+)\/(approve|reject)$/,
    )
    const requestId = mutationMatch?.[1]
    const mutationType = mutationMatch?.[2]
    const currentRequest = requestId ? findRequest(requestId) : undefined

    if (!requestId || !mutationType || !currentRequest) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "BUILDING_EDIT_REQUEST_NOT_FOUND",
            message: "Building edit request not found",
          },
          404,
        ),
      )
      return
    }

    const reviewedAt = "2026-07-25T09:00:00.000Z"
    const reviewReason = readReviewReason(route)
    const nextStatus = mutationType === "approve" ? "APPROVED" : "REJECTED"
    const updatedRequest: AdminBuildingEditRequestMock = {
      ...currentRequest,
      status: nextStatus,
      reviewReason: reviewReason || null,
      reviewedBy: smokeAuthUser,
      reviewedAt,
      updatedAt: reviewedAt,
      ...(mutationType === "approve"
        ? { building: buildApprovedBuilding() }
        : {}),
    }

    buildingEditRequests = buildingEditRequests.map((request) =>
      request._id === requestId ? updatedRequest : request,
    )

    if (mutationType === "approve") {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            request: updatedRequest,
            building: buildApprovedBuilding(),
          },
        }),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: updatedRequest,
      }),
    )
  }

  const handleBuildingEditRequestsList = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const status = url.searchParams.get("status")
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")
    const filteredRequests =
      status && status !== "all"
        ? buildingEditRequests.filter((request) => request.status === status)
        : buildingEditRequests

    await route.fulfill(
      jsonRoute({
        success: true,
        data: filteredRequests,
        pagination: {
          page: pageNumber,
          limit,
          total: filteredRequests.length,
        },
      }),
    )
  }

  const handleBuildingEditRequestDetail = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const requestId = url.pathname.split("/").pop()
    const currentRequest = requestId ? findRequest(requestId) : undefined

    if (!currentRequest) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "BUILDING_EDIT_REQUEST_NOT_FOUND",
            message: "Building edit request not found",
          },
          404,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: currentRequest,
      }),
    )
  }

  await page.route(
    adminBuildingEditRequestMutationUrl,
    handleBuildingEditRequestMutation,
  )
  await page.route(adminBuildingEditRequestsListUrl, handleBuildingEditRequestsList)
  await page.route(
    adminBuildingEditRequestDetailUrl,
    handleBuildingEditRequestDetail,
  )
}
