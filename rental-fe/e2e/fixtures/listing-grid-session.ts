import type { Page } from "@playwright/test"
import { loadEnv } from "vite"

import {
  installAuthenticatedSessionMocks,
  smokeAgentProfile,
  smokeAuthUser,
  waitForAuthenticatedProfile,
  type AuthenticatedSessionMockOptions,
} from "./authenticated-session"
import { smokeListingBuilding } from "./lister-onboarding"
import {
  buildSmokeOwnerListingsOfCount,
  paginateSmokeOwnerListings,
  searchSmokeOwnerListings,
  toSmokeOwnerListingAgentProfile,
  type SmokeOwnerListing,
} from "./owner-listings-session"

export const LISTING_GRID_SMOKE_COUNT = 30

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

function buildGridSmokeListings() {
  return buildSmokeOwnerListingsOfCount(LISTING_GRID_SMOKE_COUNT, {
    listedBy: smokeAuthUser._id,
    agentProfile: toSmokeOwnerListingAgentProfile(smokeAgentProfile),
  })
}

function toPublicSearchListing(listing: SmokeOwnerListing) {
  const { agentProfile: _agentProfile, ...searchListing } = listing

  return searchListing
}

function getPublicGridListings() {
  return buildGridSmokeListings().filter(
    (listing) => listing.visibility === "PUBLIC",
  )
}

export async function installBuildingListingGridRoute(page: Page) {
  const publicListings = getPublicGridListings()

  await page.unroute("**/api/v1/search/buildings/*/listings**")
  await page.route("**/api/v1/search/buildings/*/listings**", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      page?: number
      limit?: number
    } | null
    const pageNumber = Number(requestBody?.page ?? 1)
    const limit = Number(requestBody?.limit ?? 20)
    const paginated = paginateSmokeOwnerListings(
      publicListings.map(toPublicSearchListing),
      pageNumber,
      limit,
    )

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          building: {
            ...smokeListingBuilding,
            isFollowing: false,
          },
          listings: paginated.items,
        },
        pagination: {
          page: paginated.page,
          limit: paginated.limit,
          total: paginated.total,
        },
      }),
    )
  })
}

export async function installListingGridSessionMocks(
  page: Page,
  options: AuthenticatedSessionMockOptions = {},
) {
  await installAuthenticatedSessionMocks(page, {
    ownerListingCount: LISTING_GRID_SMOKE_COUNT,
    ...options,
  })

  const publicListings = getPublicGridListings()

  await page.unroute("**/api/v1/search/listings/**")
  await page.route("**/api/v1/search/listings/*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const listingId = route
      .request()
      .url()
      .split("/search/listings/")[1]
      ?.split("?")[0]
    const listing = buildGridSmokeListings().find((item) => item._id === listingId)

    if (!listing) {
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
      return
    }

    await route.fulfill(
      jsonRoute({
        success: true,
        data: toPublicSearchListing(listing),
      }),
    )
  })

  await installBuildingListingGridRoute(page)

  await page.route(
    `**/api/v1/search/agents/${smokeAgentProfile._id}`,
    async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }

      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            agentProfile: {
              ...smokeAgentProfile,
              listingSummary: {
                activeCount: publicListings.length,
                pendingCount: 0,
                approvedCount: publicListings.length,
                rejectedCount: 0,
              },
            },
          },
        }),
      )
    },
  )

  await page.route(
    `**/api/v1/search/agents/${smokeAgentProfile._id}/listings**`,
    async (route) => {
      const url = new URL(route.request().url())
      const paginated = searchSmokeOwnerListings(
        buildGridSmokeListings(),
        url.searchParams,
      )

      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            agentProfile: {
              _id: smokeAgentProfile._id,
              displayName: smokeAgentProfile.displayName,
              isOnline: true,
              isVerified: true,
              createdAt: smokeAgentProfile.createdAt,
            },
            listings: paginated.items.map(toPublicSearchListing),
          },
          pagination: {
            page: paginated.page,
            limit: paginated.limit,
            total: paginated.total,
            totalPages: Math.ceil(paginated.total / paginated.limit),
          },
        }),
      )
    },
  )

  await page.route("**/api/v1/building-follows/buildings/**", async (route) => {
    await route.fulfill(
      jsonRoute({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
        },
      }),
    )
  })
}

export { waitForAuthenticatedProfile }
