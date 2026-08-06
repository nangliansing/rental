import type { Page, Route } from "@playwright/test"

import {
  buildSmokeOwnerListings,
  buildSmokeOwnerListingsOfCount,
  searchSmokeOwnerListings,
  toSmokeOwnerListingAgentProfile,
} from "./owner-listings-session"
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
    activeCount: 5,
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
      secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
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
        secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        resourceType: "image",
        position: 0,
        alt: "Bright rental room",
        isCover: true,
      },
    ],
    isSavedByMe: true,
    description: "A bright room.",
    availableAt: null,
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
  withPendingPost?: boolean
  role?: "USER" | "ADMIN" | "OWNER"
  ownerListingCount?: number
}

function buildSeedPendingPost(): SmokePendingPost {
  const now = "2026-07-25T08:00:00.000Z"

  return {
    _id: "pending-smoke-seed-1",
    status: "PENDING",
    submittedBy: smokeAuthUser._id,
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
      contractMonths: 12,
      bedroomCount: 1,
      size: 30,
      media: [
        {
          publicId: "test/pending-cover",
          secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          resourceType: "image",
          position: 0,
          alt: "Pending room",
          isCover: true,
        },
      ],
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
  const sessionRole = options.role ?? "USER"
  const sessionUser = {
    ...smokeAuthUser,
    role: sessionRole,
  }
  let hasAgentProfile = options.hasAgentProfile ?? true
  let createdAgentProfile = hasAgentProfile
    ? { ...smokeAgentProfile }
    : buildCreatedAgentProfile()
  let ownerPendingPosts: SmokePendingPost[] = options.withPendingPost
    ? [buildSeedPendingPost()]
    : []
  let nextPendingPostId = ownerPendingPosts.length + 1
  let isSessionActive = true

  const getSmokeOwnerListings = () => {
    const listingInput = {
      listedBy: smokeAuthUser._id,
      agentProfile: toSmokeOwnerListingAgentProfile(createdAgentProfile),
    }

    if (
      options.ownerListingCount != null &&
      options.ownerListingCount > buildSmokeOwnerListings(listingInput).length
    ) {
      return buildSmokeOwnerListingsOfCount(
        options.ownerListingCount,
        listingInput,
      )
    }

    return buildSmokeOwnerListings(listingInput)
  }

  const getSmokeOwnerListingById = (listingId: string) =>
    getSmokeOwnerListings().find((listing) => listing._id === listingId) ?? null

  if (options.withPendingPost) {
    createdAgentProfile = {
      ...createdAgentProfile,
      listingSummary: {
        ...createdAgentProfile.listingSummary,
        pendingCount: ownerPendingPosts.length,
      },
    }
  }

  if (options.ownerListingCount != null && options.ownerListingCount > 5) {
    const publicListingCount = getSmokeOwnerListings().filter(
      (listing) => listing.visibility === "PUBLIC",
    ).length

    createdAgentProfile = {
      ...createdAgentProfile,
      listingSummary: {
        ...createdAgentProfile.listingSummary,
        activeCount: publicListingCount,
      },
    }
  }

  await page.route("**/api/v1/users/token/refresh", async (route) => {
    if (!isSessionActive) {
      await route.fulfill(
        jsonRoute(
          {
            success: false,
            code: "INVALID_REFRESH_TOKEN",
            message: "Your session expired. Please log in again.",
          },
          401,
        ),
      )
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: { accessToken: smokeAccessToken },
      }),
    )
  })

  await page.route("**/api/v1/users/logout", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    isSessionActive = false

    await route.fulfill(
      jsonRoute({
        success: true,
        message: "Logged out",
      }),
    )
  })

  await page.route("**/api/v1/users/me", async (route) => {
    if (!isSessionActive || !isAuthorized(route)) {
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
        data: { user: sessionUser },
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
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      createdAgentProfile = {
        ...createdAgentProfile,
        ...requestBody,
      }

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

  await page.route("**/api/v1/saved-searches**", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() === "GET") {
      const url = new URL(route.request().url())
      const pageParam = Number(url.searchParams.get("page") ?? "1")
      const limitParam = Number(url.searchParams.get("limit") ?? "20")

      await route.fulfill(
        jsonRoute({
          success: true,
          data: [],
          pagination: {
            page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
            limit:
              Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 20,
            total: 0,
            totalPages: 0,
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

    const url = new URL(route.request().url())
    const result = searchSmokeOwnerListings(
      getSmokeOwnerListings(),
      url.searchParams,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          agentProfile: createdAgentProfile,
          listings: result.items,
        },
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      }),
    )
  })

  await page.route("**/api/v1/search/listings/listing-smoke-1", async (route) => {
    await route.fulfill(
      jsonRoute(
        {
          success: false,
          code: "LISTING_NOT_FOUND",
          message: "This listing could not be found.",
        },
        404,
      ),
    )
  })

  await page.route("**/api/v1/listings/*", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const listingId = route.request().url().split("/listings/")[1]?.split("?")[0]

    if (!listingId || listingId.includes("?")) {
      await route.continue()
      return
    }

    const listing = getSmokeOwnerListingById(listingId)

    if (!listing) {
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

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          agentProfile: createdAgentProfile,
          listing,
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

    if (route.request().method() === "PATCH") {
      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            matchedCount: 1,
            modifiedCount: 1,
          },
        }),
      )
      return
    }

    const url = new URL(route.request().url())
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")

    await route.fulfill(
      jsonRoute({
        success: true,
        data: [],
        unreadCount: 0,
        pagination: {
          page: pageNumber,
          limit,
          total: 0,
        },
      }),
    )
  })

  await page.route("**/api/v1/notifications/me/read-all", async (route) => {
    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          matchedCount: 1,
          modifiedCount: 1,
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
