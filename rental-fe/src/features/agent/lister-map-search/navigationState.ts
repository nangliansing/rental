import {
  parseListingMedia,
  readNullableString,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"

import type { ListerMapSearchSeed } from "./types"

export const LISTER_MAP_SEARCH_LOCATION_STATE_KEY = "listerMapSearchSeed"

export function createListerMapSearchNavigationState(seed: ListerMapSearchSeed) {
  return {
    [LISTER_MAP_SEARCH_LOCATION_STATE_KEY]: seed,
  }
}

export function parseListerMapSearchSeed(value: unknown): ListerMapSearchSeed | null {
  const record = readRecord(value)
  const id = readString(record._id)?.trim()

  if (!id) return null

  return {
    _id: id,
    displayName: readNullableString(record.displayName),
    profilePhoto: parseListingMedia(record.profilePhoto),
  }
}

export function readListerMapSearchSeedFromLocationState(
  state: unknown,
): ListerMapSearchSeed | null {
  if (!state || typeof state !== "object") return null

  const seedValue = (state as Record<string, unknown>)[
    LISTER_MAP_SEARCH_LOCATION_STATE_KEY
  ]

  return parseListerMapSearchSeed(seedValue)
}

export function isListerMapSearchSeedMatchingIds(
  seed: ListerMapSearchSeed,
  agentProfileIds: string[],
): boolean {
  if (!seed._id) return false

  return agentProfileIds.some(
    (id) => typeof id === "string" && id.trim() === seed._id,
  )
}
