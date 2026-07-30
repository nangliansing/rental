const MS_PER_DAY = 24 * 60 * 60 * 1000
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000

export type SmokeOwnerListingFilter = "all" | "now" | "soon" | "private"
export type SmokeOwnerListingSort = "latest" | "oldest"

export type SmokeOwnerListingAgentProfile = {
  _id: string
  userId: string
  displayName: string
  profilePhoto: null
  phone: string
  lineUrl: null
  whatsappPhone: null
  telegramUrl: null
  viberPhone: null
  supportLanguages: string[]
  isVerified: true
  isOnline: true
}

export type SmokeOwnerListing = {
  _id: string
  visibility: "PUBLIC" | "PRIVATE"
  isDeleted: false
  isForeignerAccepted: true
  isTM30Provided: true
  rent: number
  deposit: number
  moveInCost: number
  electricRate: number
  waterRate: number
  bedroomCount: number
  bathroomCount: number
  kitchenType: string
  size: number
  contractMonths: number
  occupancy: number
  isCookingAllowed: true
  isPetAllowed: false
  facilities: string[]
  media: Array<{
    publicId: string
    secureUrl: string
    resourceType: "image"
    position: number
    alt: string
    isCover: true
  }>
  isSavedByMe: boolean
  description: string
  availableAt: string | null
  listedBy: string
  buildingId: string
  createdAt: string
  updatedAt: string
  building: {
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
    minRent: number
    maxRent: number
  }
  agentProfile: SmokeOwnerListingAgentProfile
}

type BuildSmokeOwnerListingsInput = {
  referenceDate?: Date
  listedBy: string
  agentProfile: SmokeOwnerListingAgentProfile
}

const smokeOwnerListingBuilding = {
  _id: "building-smoke-1",
  name: "Bangkapi Residence",
  buildingType: "Apartment",
  facilities: ["Parking"],
  security: ["CCTV"],
  location: {
    type: "Point" as const,
    coordinates: [100.6435, 13.7654] as [number, number],
  },
  address: "Bang Kapi, Bangkok",
  minRent: 14000,
  maxRent: 17000,
}

function getBangkokDayStart(referenceDate = new Date()) {
  const bangkokTime = new Date(referenceDate.getTime() + BANGKOK_OFFSET_MS)
  const year = bangkokTime.getUTCFullYear()
  const month = bangkokTime.getUTCMonth()
  const day = bangkokTime.getUTCDate()

  return new Date(Date.UTC(year, month, day) - BANGKOK_OFFSET_MS)
}

function getBangkokTomorrowStart(referenceDate = new Date()) {
  return new Date(getBangkokDayStart(referenceDate).getTime() + MS_PER_DAY)
}

function toBangkokAvailabilityIso(referenceDate: Date) {
  return referenceDate.toISOString()
}

function createSmokeOwnerListing({
  _id,
  visibility,
  availableAt,
  rent,
  description,
  createdAt,
  listedBy,
  agentProfile,
}: {
  _id: string
  visibility: "PUBLIC" | "PRIVATE"
  availableAt: string | null
  rent: number
  description: string
  createdAt: string
  listedBy: string
  agentProfile: SmokeOwnerListingAgentProfile
}): SmokeOwnerListing {
  return {
    _id,
    visibility,
    isDeleted: false,
    isForeignerAccepted: true,
    isTM30Provided: true,
    rent,
    deposit: rent * 2,
    moveInCost: rent * 3,
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
        publicId: `test/${_id}`,
        secureUrl: "https://example.com/listing.jpg",
        resourceType: "image",
        position: 0,
        alt: description,
        isCover: true,
      },
    ],
    isSavedByMe: _id === "listing-smoke-1",
    description,
    availableAt,
    listedBy,
    buildingId: smokeOwnerListingBuilding._id,
    createdAt,
    updatedAt: createdAt,
    building: smokeOwnerListingBuilding,
    agentProfile,
  }
}

export function buildSmokeOwnerListings({
  referenceDate = new Date(),
  listedBy,
  agentProfile,
}: BuildSmokeOwnerListingsInput): SmokeOwnerListing[] {
  const today = getBangkokDayStart(referenceDate)
  const yesterday = new Date(today.getTime() - MS_PER_DAY)
  const tomorrow = getBangkokTomorrowStart(referenceDate)
  const dayAfterTomorrow = new Date(tomorrow.getTime() + MS_PER_DAY)

  return [
    createSmokeOwnerListing({
      _id: "listing-smoke-1",
      visibility: "PUBLIC",
      availableAt: null,
      rent: 14000,
      description: "Flexible public room",
      createdAt: "2026-07-21T00:00:00.000Z",
      listedBy,
      agentProfile,
    }),
    createSmokeOwnerListing({
      _id: "listing-smoke-now",
      visibility: "PUBLIC",
      availableAt: toBangkokAvailabilityIso(yesterday),
      rent: 15000,
      description: "Available now room",
      createdAt: "2026-07-22T00:00:00.000Z",
      listedBy,
      agentProfile,
    }),
    createSmokeOwnerListing({
      _id: "listing-smoke-soon",
      visibility: "PUBLIC",
      availableAt: toBangkokAvailabilityIso(tomorrow),
      rent: 16000,
      description: "Available soon room",
      createdAt: "2026-07-23T00:00:00.000Z",
      listedBy,
      agentProfile,
    }),
    createSmokeOwnerListing({
      _id: "listing-smoke-soon-later",
      visibility: "PUBLIC",
      availableAt: toBangkokAvailabilityIso(dayAfterTomorrow),
      rent: 16500,
      description: "Available later room",
      createdAt: "2026-07-24T00:00:00.000Z",
      listedBy,
      agentProfile,
    }),
    createSmokeOwnerListing({
      _id: "listing-smoke-private",
      visibility: "PRIVATE",
      availableAt: toBangkokAvailabilityIso(tomorrow),
      rent: 17000,
      description: "Private room",
      createdAt: "2026-07-25T00:00:00.000Z",
      listedBy,
      agentProfile,
    }),
  ]
}

function normalizeFilterParam(value: string | null): SmokeOwnerListingFilter | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (
    normalized === "all" ||
    normalized === "now" ||
    normalized === "soon" ||
    normalized === "private"
  ) {
    return normalized
  }

  return null
}

function normalizeSortParam(value: string | null): SmokeOwnerListingSort {
  return value?.trim().toLowerCase() === "oldest" ? "oldest" : "latest"
}

function matchesOwnerListingFilter(
  listing: SmokeOwnerListing,
  filter: SmokeOwnerListingFilter,
  referenceDate: Date,
) {
  switch (filter) {
    case "all":
      return true
    case "private":
      return listing.visibility === "PRIVATE"
    case "now": {
      if (listing.visibility !== "PUBLIC" || listing.availableAt == null) {
        return false
      }

      return (
        new Date(listing.availableAt).getTime() <
        getBangkokTomorrowStart(referenceDate).getTime()
      )
    }
    case "soon": {
      if (listing.visibility !== "PUBLIC" || listing.availableAt == null) {
        return false
      }

      return (
        new Date(listing.availableAt).getTime() >=
        getBangkokTomorrowStart(referenceDate).getTime()
      )
    }
    default:
      return false
  }
}

function applyLegacyVisibilityFilter(
  listings: SmokeOwnerListing[],
  visibility: string | null,
) {
  const normalized = visibility?.trim().toUpperCase()

  if (normalized === "PUBLIC") {
    return listings.filter((listing) => listing.visibility === "PUBLIC")
  }

  if (normalized === "PRIVATE") {
    return listings.filter((listing) => listing.visibility === "PRIVATE")
  }

  return listings
}

export function filterSmokeOwnerListings(
  listings: SmokeOwnerListing[],
  query: URLSearchParams,
  referenceDate = new Date(),
) {
  const filter = normalizeFilterParam(query.get("filter"))

  if (filter) {
    if (filter === "all") {
      return listings
    }

    return listings.filter((listing) =>
      matchesOwnerListingFilter(listing, filter, referenceDate),
    )
  }

  return applyLegacyVisibilityFilter(listings, query.get("visibility"))
}

export function sortSmokeOwnerListings(
  listings: SmokeOwnerListing[],
  filter: SmokeOwnerListingFilter | null,
  sort: SmokeOwnerListingSort,
) {
  const createdAtDirection = sort === "oldest" ? 1 : -1
  const idDirection = sort === "oldest" ? -1 : 1
  const sorted = [...listings]

  sorted.sort((left, right) => {
    if (filter === "soon") {
      const availabilityCompare =
        new Date(left.availableAt ?? 0).getTime() -
        new Date(right.availableAt ?? 0).getTime()

      if (availabilityCompare !== 0) {
        return availabilityCompare
      }
    }

    const createdAtCompare =
      createdAtDirection *
      (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())

    if (createdAtCompare !== 0) {
      return createdAtCompare
    }

    return idDirection * left._id.localeCompare(right._id)
  })

  return sorted
}

export function paginateSmokeOwnerListings<T>(
  listings: T[],
  page: number,
  limit: number,
) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20
  const start = (safePage - 1) * safeLimit

  return {
    items: listings.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total: listings.length,
  }
}

export function searchSmokeOwnerListings(
  listings: SmokeOwnerListing[],
  query: URLSearchParams,
  referenceDate = new Date(),
) {
  const filter = normalizeFilterParam(query.get("filter"))
  const sort = normalizeSortParam(query.get("sort"))
  const page = Number(query.get("page") ?? "1")
  const limit = Number(query.get("limit") ?? "20")

  const filtered = filterSmokeOwnerListings(listings, query, referenceDate)
  const sorted = sortSmokeOwnerListings(filtered, filter, sort)
  const paginated = paginateSmokeOwnerListings(sorted, page, limit)

  return paginated
}

export function toSmokeOwnerListingAgentProfile(
  agentProfile: {
    _id: string
    userId: string
    displayName: string
    phone: string
    supportLanguages: string[]
  },
): SmokeOwnerListingAgentProfile {
  return {
    _id: agentProfile._id,
    userId: agentProfile.userId,
    displayName: agentProfile.displayName,
    profilePhoto: null,
    phone: agentProfile.phone,
    lineUrl: null,
    whatsappPhone: null,
    telegramUrl: null,
    viberPhone: null,
    supportLanguages: agentProfile.supportLanguages,
    isVerified: true,
    isOnline: true,
  }
}
