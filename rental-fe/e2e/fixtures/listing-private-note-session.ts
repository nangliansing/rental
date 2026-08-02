import type { Page, Route } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAccessToken,
  smokeAgentProfile,
  smokeAuthUser,
  waitForAuthenticatedProfile,
} from "./authenticated-session"
import { smokeListingBuilding } from "./lister-onboarding"
import {
  buildSmokeOwnerListings,
  toSmokeOwnerListingAgentProfile,
  type SmokeOwnerListing,
} from "./owner-listings-session"

export const smokePrivateNoteListingId = "listing-smoke-1"
export const smokePrivateNoteText = "Gate code 1234. Call before viewing."
export const smokePrivateNoteUpdatedText = "Updated gate code 5678."

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

function isAuthorized(route: Route) {
  const authorization = route.request().headers().authorization ?? ""
  return authorization === `Bearer ${smokeAccessToken}`
}

function stripPrivateNote<T extends Record<string, unknown>>(listing: T) {
  const { privateNote: _privateNote, ...rest } = listing
  return rest
}

function normalizePrivateNote(value: unknown) {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildSmokeListings() {
  return buildSmokeOwnerListings({
    listedBy: smokeAuthUser._id,
    agentProfile: toSmokeOwnerListingAgentProfile(smokeAgentProfile),
  })
}

function getSmokeListingById(listingId: string) {
  return buildSmokeListings().find((listing) => listing._id === listingId) ?? null
}

function buildOwnerPatchResponse(listing: SmokeOwnerListing) {
  return {
    _id: listing._id,
    visibility: listing.visibility,
    isForeignerAccepted: listing.isForeignerAccepted,
    isTM30Provided: listing.isTM30Provided,
    rent: listing.rent,
    deposit: listing.deposit,
    moveInCost: listing.moveInCost,
    electricRate: listing.electricRate,
    waterRate: listing.waterRate,
    bedroomCount: listing.bedroomCount,
    bathroomCount: listing.bathroomCount,
    kitchenType: listing.kitchenType,
    size: listing.size,
    contractMonths: listing.contractMonths,
    occupancy: listing.occupancy,
    isCookingAllowed: listing.isCookingAllowed,
    isPetAllowed: listing.isPetAllowed,
    facilities: listing.facilities,
    media: listing.media,
    description: listing.description,
    availableAt: listing.availableAt,
    isDeleted: listing.isDeleted,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    listedBy: listing.listedBy,
    buildingId: listing.buildingId,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  }
}

function toPublicListingResponse(
  listing: SmokeOwnerListing,
  privateNote: string | null,
  includePrivateNote: boolean,
) {
  const payload = {
    ...listing,
    ...(includePrivateNote && privateNote ? { privateNote } : {}),
  }

  if (!includePrivateNote || !privateNote) {
    return stripPrivateNote(payload)
  }

  return payload
}

export async function fillPrivateNoteField(page: Page, note: string) {
  await page.getByRole("textbox", { name: "Private note" }).fill(note)
}

export async function installListingPrivateNoteSessionMocks(page: Page) {
  await installAuthenticatedSessionMocks(page)

  const privateNotes = new Map<string, string | null>([
    [smokePrivateNoteListingId, smokePrivateNoteText],
  ])

  const getPrivateNote = (listingId: string) =>
    privateNotes.get(listingId) ?? null

  const setPrivateNote = (listingId: string, value: string | null) => {
    privateNotes.set(listingId, value)
  }

  await page.unroute("**/api/v1/search/listings/listing-smoke-1")
  await page.unroute("**/api/v1/search/listings/*")
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
    const listing = listingId ? getSmokeListingById(listingId) : null

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

    const isOwner =
      isAuthorized(route) && listing.listedBy === smokeAuthUser._id

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          listing: toPublicListingResponse(
            listing,
            getPrivateNote(listing._id),
            isOwner,
          ),
        },
      }),
    )
  })

  await page.unroute("**/api/v1/listings/*")
  await page.route("**/api/v1/listings/*", async (route) => {
    const listingId = route.request().url().split("/listings/")[1]?.split("?")[0]

    if (!listingId) {
      await route.continue()
      return
    }

    if (!isAuthorized(route)) {
      await route.fulfill(jsonRoute({ success: false }, 401))
      return
    }

    const listing = getSmokeListingById(listingId)

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

    if (route.request().method() === "GET") {
      const privateNote = getPrivateNote(listingId)

      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            agentProfile: smokeAgentProfile,
            listing:
              privateNote == null
                ? listing
                : {
                    ...listing,
                    privateNote,
                  },
          },
        }),
      )
      return
    }

    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>

      if (Object.hasOwn(body, "privateNote")) {
        setPrivateNote(listingId, normalizePrivateNote(body.privateNote))
      }

      const updatedListing = {
        ...listing,
        updatedAt: new Date().toISOString(),
      }

      await route.fulfill(
        jsonRoute({
          success: true,
          data: buildOwnerPatchResponse(updatedListing),
        }),
      )
      return
    }

    await route.continue()
  })
}

export async function installAnonymousListingPrivateNoteMocks(page: Page) {
  await page.route("**/api/v1/users/token/refresh", async (route) => {
    await route.fulfill(
      jsonRoute(
        {
          success: false,
          code: "REFRESH_TOKEN_REQUIRED",
          message: "Please log in to continue.",
        },
        401,
      ),
    )
  })

  await page.route("**/api/v1/users/me", async (route) => {
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
  })

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
    const listing =
      listingId === smokePrivateNoteListingId
        ? getSmokeListingById(listingId)
        : null

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
        data: {
          listing: stripPrivateNote(listing),
        },
      }),
    )
  })

  await page.route("**/api/v1/lister-reviews/listers/**", async (route) => {
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

  await page.route("**/api/v1/buildings/*", async (route) => {
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
}

export { waitForAuthenticatedProfile }
