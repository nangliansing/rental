import { afterEach, describe, expect, it, vi } from "vitest"

import type { ListingFormValues } from "@/features/listing/components/ListingForm"

import {
  buildPendingPostListingApiPayload,
  createPendingPost,
  parseListing,
} from "./createPendingPost"

const listingPhoto = {
  publicId: "listing/test-photo",
  secureUrl: "https://example.com/photo.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120_000,
  position: 0,
  alt: "Room",
  isCover: true,
}

const baseListingFormValues: ListingFormValues = {
  visibility: "PUBLIC",
  isForeignerAccepted: true,
  isTM30Provided: false,
  rent: 14000,
  deposit: 28000,
  moveInCost: 42000,
  electricRate: null,
  waterRate: null,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
  size: 36,
  contractMonths: 3,
  occupancy: 1,
  isCookingAllowed: true,
  isPetAllowed: false,
  facilities: [],
  media: [listingPhoto],
  description: "Test room",
  availabilityMode: "flexible",
  availableFromDate: "",
}

const apiClientMocks = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: apiClientMocks.post,
  },
}))

describe("buildPendingPostListingApiPayload", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("sends availableAt null for flexible listings", () => {
    const payload = buildPendingPostListingApiPayload(baseListingFormValues)

    expect(payload.availableAt).toBeNull()
    expect(payload).not.toHaveProperty("availabilityMode")
    expect(payload).not.toHaveProperty("availableFromDate")
    expect(payload.rent).toBe(14000)
  })

  it("sends today's Thailand date for available now", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const payload = buildPendingPostListingApiPayload({
      ...baseListingFormValues,
      availabilityMode: "now",
    })

    expect(payload.availableAt).toBe("2026-07-29")
  })

  it("sends the selected date for available from date", () => {
    const payload = buildPendingPostListingApiPayload({
      ...baseListingFormValues,
      availabilityMode: "from_date",
      availableFromDate: "2026-08-15",
    })

    expect(payload.availableAt).toBe("2026-08-15")
  })
})

describe("parseListing", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("maps API availableAt into form availability fields", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(
      parseListing({
        ...baseListingFormValues,
        availableAt: null,
      }).availabilityMode,
    ).toBe("flexible")

    expect(
      parseListing({
        ...baseListingFormValues,
        availableAt: "2026-07-29T00:00:00+07:00",
      }).availabilityMode,
    ).toBe("now")

    expect(
      parseListing({
        ...baseListingFormValues,
        availableAt: "2026-08-15T00:00:00+07:00",
      }),
    ).toMatchObject({
      availabilityMode: "from_date",
      availableFromDate: "2026-08-15",
    })
  })
})

describe("createPendingPost", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("posts listing.availableAt to /pending-posts without form-only fields", async () => {
    apiClientMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          _id: "pending-1",
          status: "PENDING",
          submittedBy: "user-1",
          existingBuildingId: "building-1",
          building: null,
          listing: {
            ...baseListingFormValues,
            availableAt: null,
          },
          reviewNote: null,
          reviewedBy: null,
          reviewedAt: null,
          approvedBuildingId: null,
          approvedListingId: null,
          isDeleted: false,
          createdAt: "2026-07-29T00:00:00.000Z",
          updatedAt: "2026-07-29T00:00:00.000Z",
        },
      },
    })

    await createPendingPost({
      existingBuildingId: "building-1",
      listing: baseListingFormValues,
    })

    expect(apiClientMocks.post).toHaveBeenCalledWith("/pending-posts", {
      existingBuildingId: "building-1",
      listing: expect.objectContaining({
        availableAt: null,
        rent: 14000,
      }),
    })

    const postedListing = apiClientMocks.post.mock.calls[0][1].listing
    expect(postedListing).not.toHaveProperty("availabilityMode")
    expect(postedListing).not.toHaveProperty("availableFromDate")
  })
})
