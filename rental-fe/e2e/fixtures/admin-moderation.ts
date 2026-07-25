import type { Page } from "@playwright/test"

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

export async function installAdminModerationMocks(page: Page) {
  await installAuthenticatedSessionMocks(page, {
    hasAgentProfile: false,
    role: "ADMIN",
  })

  let pendingPosts: AdminModerationPendingPost[] = [
    buildAdminModerationPendingPost(),
  ]

  await page.route("**/api/v1/admin/pending-posts**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === "PATCH") {
      const approveMatch = url.pathname.match(
        /\/admin\/pending-posts\/([^/]+)\/approve$/,
      )
      const rejectMatch = url.pathname.match(
        /\/admin\/pending-posts\/([^/]+)\/reject$/,
      )
      const pendingPostId = approveMatch?.[1] ?? rejectMatch?.[1]
      const action = approveMatch ? "APPROVED" : rejectMatch ? "REJECTED" : null

      if (!pendingPostId || !action) {
        await route.continue()
        return
      }

      const requestBody = request.postDataJSON() as { reason?: string }
      const reason =
        typeof requestBody.reason === "string" ? requestBody.reason : ""
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
      return
    }

    if (request.method() === "GET") {
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
      return
    }

    await route.continue()
  })
}

export const adminModerationBuildingName = smokeListingBuilding.name
