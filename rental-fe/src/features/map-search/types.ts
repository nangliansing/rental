// src/features/map-search/types.ts
import type { ListerReviewSummary } from "@/features/lister-review/api"

export type MapPosition = {
  lat: number
  lng: number
}

export type GeoJsonPosition = [longitude: number, latitude: number]

export type LineStringGeometry = {
  type: "LineString"
  coordinates: GeoJsonPosition[]
}

export type MultiLineStringGeometry = {
  type: "MultiLineString"
  coordinates: GeoJsonPosition[][]
}

export type SearchLinesGeometry =
  | LineStringGeometry
  | MultiLineStringGeometry

export type SearchedPlace = {
  name: string
  position: MapPosition
}

export type BuildingLocation = {
  type: "Point"
  coordinates: [number, number]
}

export type Pagination = {
  page: number
  limit: number
  total: number
}

export type ListingMedia = {
  publicId: string
  secureUrl: string
  resourceType?: string
  format?: string | null
  width?: number | null
  height?: number | null
  bytes?: number | null
  position?: number
  alt?: string | null
  isCover?: boolean
}

export type BuildingListing = {
  _id: string
  rent: number
  deposit: number
  moveInCost: number
  electricRate: number | null
  waterRate: number | null
  bedroomCount: number
  bathroomCount: number
  kitchenType: string
  size: number
  contractMonths: number
  occupancy: number
  isCookingAllowed: boolean
  isPetAllowed: boolean
  facilities: string[]
  media: ListingMedia[]
  isSavedByMe: boolean
  availableAt: string | null
  updatedAt: string
}

export type SearchBuilding = {
  distanceMeters?: number
  _id: string
  name: string
  buildingType: string
  facilities: string[]
  security: string[]
  location: BuildingLocation
  address: string
  minRent: number | null
  maxRent: number | null
  isFollowing: boolean
  listings: BuildingListing[]
}

export type SearchBuildingsInMapResponse = {
  success: true
  data: SearchBuilding[]
  pagination: Pagination
}

export type SearchBuildingsNearLinesResponse = SearchBuildingsInMapResponse

export type SearchBuildingsNearbyResponse = {
  success: true
  data: SearchBuilding[]
}

export type ListingAgentProfile = {
  _id: string
  userId: string
  displayName: string
  profilePhoto: ListingMedia | null
  phone: string | null
  lineUrl: string | null
  whatsappPhone: string | null
  telegramUrl: string | null
  viberPhone: string | null
  supportLanguages: string[]
  reviewSummary?: ListerReviewSummary
  isVerified: boolean
  isOnline: boolean
}

export type SearchListing = {
  _id: string
  visibility: "PUBLIC" | "PRIVATE"
  isDeleted: boolean
  isForeignerAccepted: boolean
  isTM30Provided: boolean
  rent: number
  deposit: number
  moveInCost: number
  electricRate: number | null
  waterRate: number | null
  bedroomCount: number
  bathroomCount: number
  kitchenType: string
  size: number
  contractMonths: number
  occupancy: number
  isCookingAllowed: boolean
  isPetAllowed: boolean
  facilities: string[]
  media: ListingMedia[]
  isSavedByMe: boolean
  availableAt: string | null
  description: string
  privateNote?: string | null
  listedBy: string
  buildingId: string
  createdAt: string
  updatedAt: string
  agentProfile?: ListingAgentProfile | null
}

export type SearchListingsBuilding = Omit<SearchBuilding, "listings">

export type SearchListingsInBuildingResponse = {
  success: true
  data: {
    building: SearchListingsBuilding
    listings: SearchListing[]
  }
  pagination: Pagination
}
