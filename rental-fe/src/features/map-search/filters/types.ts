// src/features/map-search/filters/types.ts

export type MapSearchFilters = {
  minRent?: number
  maxRent?: number
  buildingType?: string
  buildingFacilities?: string[]
  security?: string[]
  listingFacilities?: string[]
  bedroomCount?: number
  bathroomCount?: number
  kitchenType?: string
  contractMonths?: number
  occupancy?: number
  isForeignerAccepted?: boolean
  isTM30Provided?: boolean
  isCookingAllowed?: boolean
  isPetAllowed?: boolean
  supportLanguages?: string[]
  agentProfileIds?: string[]
  listerIds?: string[]
}

export type FilterChipIcon =
  | "price"
  | "aircon"
  | "tm30"
  | "pet"
  | "cooking"
  | "building"
  | "contract"
  | "occupancy"
  | "security"
  | "language"
  | "bed"
  | "bath"

export type FilterChip = {
  key: keyof MapSearchFilters | string
  label: string
  icon?: FilterChipIcon
}
