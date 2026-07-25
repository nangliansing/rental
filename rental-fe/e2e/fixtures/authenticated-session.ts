import type { Page, Route } from "@playwright/test"

import { smokeListingBuilding } from "./lister-onboarding"

export const smokeAccessToken = "smoke-access-token"

export const smokeAuthUser = {
  _id: "user-smoke-1",
  name: "Nang Lian Sing",
  email: "nang.smoke@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

export const smokeAgentProfile = {
  _id: "agent-smoke-1",
  userId: smokeAuthUser._id,
  displayName: "Nang Lian Sing",
  profilePhoto: null,
  description: "Smoke test lister",
  phone: "0812345678",
  lineUrl: "",
  whatsappPhone: "",
  telegramUrl: "",
  viberPhone: "",
  supportLanguages: ["English", "Thai"],
  isOnline: true,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  isVerified: true,
  verifiedBy: null,
  verifiedAt: null,
  listingSummary: {
    activeCount: 1,
    pendingCount: 0,
    rejectedCount: 0,
  },
  reviewSummary: {
    averageRating: 4.5,
    reviewCount: 2,
    ratingCounts: {
      oneStar: 0,
      twoStars: 0,
      threeStars: 0,
      fourStars: 1,
      fiveStars: 1,
    },
    tagCounts: [],
  },
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

export const smokeSavedListing = {
  _id: "saved-smoke-1",
  listingId: "listing-smoke-1",
  buildingId: "building-smoke-1",
  listedBy: smokeAuthUser._id,
  snapshot: {
    rent: 14000,
    visibility: "PUBLIC",
    buildingName: "Bangkapi Residence",
    coverPhoto: {
      publicId: "test/listing-cover",
      secureUrl: "https://example.com/listing.jpg",
      resourceType: "image",
      position: 0,
      alt: "Bright rental room",
      isCover: true,
    },
  },
  listing: {
    _id: "listing-smoke-1",
    visibility: "PUBLIC",
    isDeleted: false,
    isForeignerAccepted: true,
    isTM30Provided: true,
    rent: 14000,
    deposit: 28000,
    moveInCost: 42000,
    electricRate: 8,
    waterRate: 20,
    bedroomCount: 1,
    bathroomCount: 1,
    kitchenType: "Kitchen",
    size: 36,
    contractMonths: 12,
    occupancy: 2,
    isCookingAllowed: true,
    isPetAllowed: false,
    facilities: ["Air Conditioner"],
    media: [
      {
        publicId: "test/listing-cover",
        secureUrl: "https://example.com/listing.jpg",
        resourceType: "image",
        position: 0,
        alt: "Bright rental room",
        isCover: true,
      },
    ],
    isSavedByMe: true,
    description: "A bright room.",
    listedBy: smokeAuthUser._id,
    buildingId: "building-smoke-1",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    building: {
      _id: "building-smoke-1",
      name: "Bangkapi Residence",
      buildingType: "Apartment",
      facilities: ["Parking"],
      security: ["CCTV"],
      location: {
        type: "Point",
        coordinates: [100.6435, 13.7654],
      },
      address: "Bang Kapi, Bangkok",
      minRent: 14000,
      maxRent: 16000,
    },
    agentProfile: {
      _id: smokeAgentProfile._id,
      userId: smokeAgentProfile.userId,
      displayName: smokeAgentProfile.displayName,
      profilePhoto: null,
      phone: smokeAgentProfile.phone,
      lineUrl: null,
      whatsappPhone: null,
      telegramUrl: null,
      viberPhone: null,
      supportLanguages: smokeAgentProfile.supportLanguages,
      isVerified: true,
      isOnline: true,
    },
  },
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export type AuthenticatedSessionMockOptions = {
  hasAgentProfile?: boolean
}

function isAuthorized(route: Route) {
  const authorization = route.request().headers().authorization ?? ""
  return authorization === `Bearer ${smokeAccessToken}`
}

function buildCreatedAgentProfile(
  values: Record<string, unknown> = {},
) {
  return {
    ...smokeAgentProfile,
    ...values,
    listingSummary: {
      activeCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
    },
    reviewSummary: {
      averageRating: 0,
      reviewCount: 0,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 0,
      },
      tagCounts: [],
    },
  }
}

type SmokePendingPost = {
  _id: string
  status: "PENDING"
  submittedBy: string
  existingBuildingId: string | null
  existingBuilding?: typeof smokeListingBuilding & {
    isActive: boolean
    minRent: number | null
    maxRent: number | null
  }
  building: Record<string, unknown> | null
  listing: Record<string, unknown>
  reviewNote: null
  reviewedBy: null
  reviewedAt: null
  approvedBuildingId: null
  approvedListingId: null
  isDeleted: false
  createdAt: string
  updatedAt: string
}

function buildPendingPostFromRequest(
  body: Record<string, unknown>,
  pendingPostId: string,
): SmokePendingPost {
  const now = "2026-07-25T08:00:00.000Z"
  const listing =
    typeof body.listing === "object" && body.listing !== null
      ? (body.listing as Record<string, unknown>)
      : {}

  if (typeof body.existingBuildingId === "string") {
    return {
      _id: pendingPostId,
      status: "PENDING",
      submittedBy: smokeAuthUser._id,
      existingBuildingId: body.existingBuildingId,
      existingBuilding: {
        ...smokeListingBuilding,
        isActive: true,
        minRent: smokeListingBuilding.minRent,
        maxRent: smokeListingBuilding.maxRent,
      },
      building: null,
      listing,
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

  const building =
    typeof body.building === "object" && body.building !== null
      ? (body.building as Record<string, unknown>)
      : null

  return {
    _id: pendingPostId,
    status: "PENDING",
    submittedBy: smokeAuthUser._id,
    existingBuildingId: null,
    building,
    listing,
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

export async function installAuthenticatedSessionMocks(
  page: Page,
  options: AuthenticatedSessionMockOptions = {},
) {
  let hasAgentProfile = options.hasAgentProfile ?? true
  let createdAgentProfile = buildCreatedAgentProfile()
  let ownerPendingPosts: SmokePendingPost[] = []
  let nextPendingPostId = 1
  await page.route("**/api/v1/users/token/refresh", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: { accessToken: smokeAccessToken },
      }),
    )
  })

  await page.route("**/api/v1/users/me", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "ACCESS_TOKEN_REQUIRED",
            message: "Access token is required",
          },
          401,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: { user: smokeAuthUser },
      }),
    )
  })

  await page.route("**/api/v1/agent-profiles/me", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() === "GET") {
      if (!hasAgentProfile) {
        await route.fulfill(
          jsonRoute(
            {
              success: false,
              code: "AGENT_PROFILE_NOT_FOUND",
              message: "Agent profile not found",
            },
            404,
          ),
        )
        return
      }

      await route.fulfill(
        jsonRoute({
          success: true,
          data: createdAgentProfile,
        }),
      )
      return
    }

    if (route.request().method() === "PATCH") {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: createdAgentProfile,
        }),
      )
      return
    }

    await route.continue()
  })

  await page.route("**/api/v1/agent-profiles", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() === "POST") {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      hasAgentProfile = true
      createdAgentProfile = buildCreatedAgentProfile(requestBody)

      await route.fulfill(
        jsonRoute({
          success: true,
          data: createdAgentProfile,
        }),
      )
      return
    }

    await route.continue()
  })

  await page.route("**/api/v1/saved-listings**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() === "GET") {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: { savedListings: [smokeSavedListing] },
          pagination: {
            page: 1,
            limit: 12,
            total: 1,
            totalPages: 1,
          },
        }),
      )
      return
    }

    await route.continue()
  })

  await page.route("**/api/v1/listings?**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: { listings: [smokeSavedListing.listing] },
        pagination: {
          page: 1,
          limit: 12,
          total: 1,
          totalPages: 1,
        },
      }),
    )
  })

  await page.route("**/api/v1/pending-posts**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() === "POST") {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      const pendingPost = buildPendingPostFromRequest(
        requestBody,
        `pending-smoke-${nextPendingPostId++}`,
      )

      ownerPendingPosts = [pendingPost, ...ownerPendingPosts]
      createdAgentProfile = {
        ...createdAgentProfile,
        listingSummary: {
          ...createdAgentProfile.listingSummary,
          pendingCount: ownerPendingPosts.length,
        },
      }

      await route.fulfill(
        jsonRoute({
          success: true,
          data: pendingPost,
        }),
      )
      return
    }

    if (route.request().method() === "GET") {
      const url = new URL(route.request().url())
      const status = url.searchParams.get("status")
      const filteredPosts =
        status && status !== "all"
          ? ownerPendingPosts.filter((post) => post.status === status)
          : ownerPendingPosts

      await route.fulfill(
        jsonRoute({
          success: true,
          data: filteredPosts,
          pagination: {
            page: 1,
            limit: 12,
            total: filteredPosts.length,
            totalPages: filteredPosts.length > 0 ? 1 : 0,
          },
        }),
      )
      return
    }

    await route.continue()
  })

  await page.route("**/api/v1/buildings/*", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const buildingId = route.request().url().split("/buildings/")[1]?.split("?")[0]

    if (buildingId !== smokeListingBuilding._id) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "BUILDING_NOT_FOUND",
            message: "Building not found",
          },
          404,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: smokeListingBuilding,
      }),
    )
  })

  await page.route("**/api/v1/lister-reviews/listers/**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: { reviews: [] },
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
        },
      }),
    )
  })

  await page.route("**/api/v1/notifications/me?**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: { notifications: [] },
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }),
    )
  })
}

export async function waitForAuthenticatedProfile(page: Page) {
  await page.getByRole("heading", { name: smokeAgentProfile.displayName }).waitFor({
    timeout: 15_000,
  })
}
