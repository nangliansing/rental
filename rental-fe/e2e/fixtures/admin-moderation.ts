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

type AdminModerationPendingPost = {
  _id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  submittedBy: {
    _id: string
    name: string
    email: string
    role: string
    status: string
  }
  agentProfile?: {
    _id: string
    userId: string
    displayName: string
    isOnline: boolean
    profilePhoto: null
    description: string | null
    phone: string | null
    lineUrl: string | null
    whatsappPhone: string | null
    telegramUrl: string | null
    viberPhone: string | null
    supportLanguages: string[]
    isVerified: boolean
  }
  existingBuildingId: string
  existingBuilding: typeof smokeListingBuilding & {
    isActive: boolean
    minRent: number
    maxRent: number
  }
  building: null
  listing: {
    rent: number
    deposit: number
    moveInCost: number
    contractMonths: number
    bedroomCount: number
    bathroomCount: number
    media: Array<{
      publicId: string
      secureUrl: string
      resourceType: string
      position: number
      alt: string
      isCover: boolean
    }>
    description: string
  }
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  approvedBuildingId: string | null
  approvedListingId: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

const adminPendingPostsListUrl =
  /\/api\/v1\/admin\/pending-posts(?:\?|$)/
const adminPendingPostsMutationUrl =
  /\/api\/v1\/admin\/pending-posts\/[^/]+\/(approve|reject)$/

function buildAdminModerationPendingPost(): AdminModerationPendingPost {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "pending-admin-smoke-1",
    status: "PENDING",
    submittedBy: {
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
      description: "Smoke test lister",
      phone: "0812345678",
      lineUrl: null,
      whatsappPhone: null,
      telegramUrl: null,
      viberPhone: null,
      supportLanguages: ["English"],
      isVerified: false,
    },
    existingBuildingId: smokeListingBuilding._id,
    existingBuilding: {
      ...smokeListingBuilding,
      isActive: true,
      minRent: smokeListingBuilding.minRent,
      maxRent: smokeListingBuilding.maxRent,
    },
    building: null,
    listing: {
      rent: 15000,
      deposit: 30000,
      moveInCost: 45000,
      contractMonths: 12,
      bedroomCount: 1,
      bathroomCount: 1,
      media: [
        {
          publicId: "test/pending-cover",
          secureUrl: "https://example.com/pending.jpg",
          resourceType: "image",
          position: 0,
          alt: "Pending room",
          isCover: true,
        },
      ],
      description: "Bright room awaiting review",
    },
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    approvedBuildingId: null,
    approvedListingId: null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }
}

function readReason(route: Route) {
  try {
    const body = route.request().postDataJSON() as { reason?: string } | null
    return typeof body?.reason === "string" ? body.reason : ""
  } catch {
    return ""
  }
}

export async function installAdminModerationMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let pendingPosts: AdminModerationPendingPost[] = [
    buildAdminModerationPendingPost(),
  ]

  const handlePendingPostMutation = async (route: Route) => {
    const url = new URL(route.request().url())
    const mutationMatch = url.pathname.match(
      /\/admin\/pending-posts\/([^/]+)\/(approve|reject)$/,
    )
    const pendingPostId = mutationMatch?.[1]
    const mutationType = mutationMatch?.[2]

    if (!pendingPostId || !mutationType) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "VALIDATION_ERROR",
            message: "Unsupported moderation action",
          },
          422,
        ),
      )
      return
    }

    const action = mutationType === "approve" ? "APPROVED" : "REJECTED"
    const reason = readReason(route)
    const currentPost = pendingPosts.find((post) => post._id === pendingPostId)

    if (!currentPost) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "PENDING_POST_NOT_FOUND",
            message: "Pending post not found",
          },
          404,
        ),
      )
      return
    }

    const reviewedAt = "2026-07-25T09:00:00.000Z"
    const updatedPost: AdminModerationPendingPost = {
      ...currentPost,
      status: action,
      reviewNote: reason,
      reviewedBy: smokeAuthUser._id,
      reviewedAt,
      updatedAt: reviewedAt,
      ...(action === "APPROVED"
        ? {
            approvedBuildingId: smokeListingBuilding._id,
            approvedListingId: "listing-approved-smoke-1",
          }
        : {}),
    }

    pendingPosts = pendingPosts.map((post) =>
      post._id === pendingPostId ? updatedPost : post,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: updatedPost,
      }),
    )
  }

  const handlePendingPostsList = async (route: Route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const status = url.searchParams.get("status")
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")
    const filteredPosts =
      status && status !== "all"
        ? pendingPosts.filter((post) => post.status === status)
        : pendingPosts

    await route.fulfill(
      jsonRoute({
        success: true,
        data: filteredPosts,
        pagination: {
          page: pageNumber,
          limit,
          total: filteredPosts.length,
        },
      }),
    )
  }

  await page.route(adminPendingPostsMutationUrl, handlePendingPostMutation)
  await page.route(adminPendingPostsListUrl, handlePendingPostsList)

  await page.route("**/api/v1/agent-profiles/agent-lister-smoke-1", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: buildAdminModerationPendingPost().agentProfile,
      }),
    )
  })

  await page.route("**/api/v1/search/listings/listing-approved-smoke-1", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          _id: "listing-approved-smoke-1",
          rent: 15000,
          building: smokeListingBuilding,
        },
      }),
    )
  })

  await page.route("**/api/v1/search/buildings/map**", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      }),
    )
  })

  await page.route("**/api/v1/search/buildings/*/listings**", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      }),
    )
  })

  await page.route("**/api/v1/listings/listing-approved-smoke-1", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          _id: "listing-approved-smoke-1",
          rent: 15000,
          buildingId: smokeListingBuilding._id,
        },
      }),
    )
  })
}

export const adminModerationBuildingName = smokeListingBuilding.name
