import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  buildOwnerListingUpdateApiBody,
  parseUpdateOwnerListingResponse,
  updateOwnerListing,
} from "./updateOwnerListing"

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

const updatedListingResponse = {
  _id: "listing-1",
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
  availableAt: null,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  listedBy: "user-1",
  buildingId: "building-1",
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
}

const apiClientMocks = vi.hoisted(() => ({
  patch: vi.fn(),
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      patch: apiClientMocks.patch,
    },
  }
})

describe("buildOwnerListingUpdateApiBody", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("passes availableAt through for explicit patch values", () => {
    expect(buildOwnerListingUpdateApiBody({ availableAt: null })).toEqual({
      availableAt: null,
    })
    expect(
      buildOwnerListingUpdateApiBody({ availableAt: "2026-08-15" }),
    ).toEqual({
      availableAt: "2026-08-15",
    })
  })

  it("converts form availability fields to availableAt and strips form-only keys", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(
      buildOwnerListingUpdateApiBody({
        availabilityMode: "now",
        availableFromDate: "",
      }),
    ).toEqual({
      availableAt: "2026-07-29",
    })

    expect(
      buildOwnerListingUpdateApiBody({
        availabilityMode: "from_date",
        availableFromDate: "2026-08-15",
      }),
    ).toEqual({
      availableAt: "2026-08-15",
    })
  })

  it("keeps unrelated patch fields alongside availableAt", () => {
    expect(
      buildOwnerListingUpdateApiBody({
        rent: 15000,
        availableAt: null,
      }),
    ).toEqual({
      rent: 15000,
      availableAt: null,
    })
  })

  it("trims privateNote to null for cleared owner updates", () => {
    expect(
      buildOwnerListingUpdateApiBody({
        privateNote: "   ",
      }),
    ).toEqual({
      privateNote: null,
    })

    expect(
      buildOwnerListingUpdateApiBody({
        privateNote: "  Gate code 1234  ",
      }),
    ).toEqual({
      privateNote: "Gate code 1234",
    })
  })

  it("trims description and privateNote independently", () => {
    expect(
      buildOwnerListingUpdateApiBody({
        description: "  Public details  ",
        privateNote: "  Owner note  ",
      }),
    ).toEqual({
      description: "Public details",
      privateNote: "Owner note",
    })
  })

  it("accepts explicit null privateNote patches", () => {
    expect(
      buildOwnerListingUpdateApiBody({
        privateNote: null,
      }),
    ).toEqual({
      privateNote: null,
    })
  })

  it("rejects unknown fields and empty patches", () => {
    expect(() =>
      buildOwnerListingUpdateApiBody({
        unknownField: "value",
      } as never),
    ).toThrow(ApiError)

    expect(() => buildOwnerListingUpdateApiBody({})).toThrow(ApiError)
  })
})

describe("parseUpdateOwnerListingResponse", () => {
  it("parses availableAt from the updated listing response", () => {
    const parsed = parseUpdateOwnerListingResponse({
      success: true,
      data: {
        ...updatedListingResponse,
        availableAt: "2026-08-15T00:00:00+07:00",
      },
    })

    expect(parsed.data.availableAt).toBe("2026-08-14T17:00:00.000Z")
  })
})

describe("updateOwnerListing", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("patches listing.availableAt without form-only fields", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: {
        success: true,
        data: updatedListingResponse,
      },
    })

    await updateOwnerListing("listing-1", { availableAt: null })

    expect(apiClientMocks.patch).toHaveBeenCalledWith(
      "/listings/listing-1",
      { availableAt: null },
    )
  })

  it("patches privateNote without form-only fields", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: {
        success: true,
        data: updatedListingResponse,
      },
    })

    await updateOwnerListing("listing-1", {
      privateNote: "  Gate code 1234  ",
    })

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/listings/listing-1", {
      privateNote: "Gate code 1234",
    })
  })

  it("patches null privateNote to clear an existing owner note", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: {
        success: true,
        data: updatedListingResponse,
      },
    })

    await updateOwnerListing("listing-1", { privateNote: null })

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/listings/listing-1", {
      privateNote: null,
    })
  })
})
