import type {
  ListingMedia,
  SearchListing,
  SearchListingsBuilding,
} from "@/features/map-search/types"

export const listingPhoto: ListingMedia = {
  publicId: "test/listing-cover",
  secureUrl: "https://example.com/listing.jpg",
  resourceType: "image",
  position: 0,
  alt: "Bright rental room",
  isCover: true,
}

export function createSearchListing(
  overrides: Partial<SearchListing> = {},
): SearchListing {
  return {
    _id: "listing-1",
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
    media: [listingPhoto],
    isSavedByMe: false,
    description: "A bright room.",
    listedBy: "user-1",
    buildingId: "building-1",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  }
}

export function createSearchBuilding(
  overrides: Partial<SearchListingsBuilding> = {},
): SearchListingsBuilding {
  return {
    _id: "building-1",
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
    ...overrides,
  }
}
