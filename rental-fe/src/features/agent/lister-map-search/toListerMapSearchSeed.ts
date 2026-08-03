import { readString } from "@/features/listing/api/listingResponseParsers"
import type { ListingMedia } from "@/features/map-search/types"

import type { ListerMapSearchSeed } from "./types"

type ListerMapSearchSeedInput = {
  _id: string
  displayName?: string | null
  profilePhoto?: ListingMedia | null
}

export function toListerMapSearchSeed(
  profile: ListerMapSearchSeedInput,
): ListerMapSearchSeed | null {
  if (!profile || typeof profile !== "object") return null

  const id = readString(profile._id).trim()
  if (!id) return null

  return {
    _id: id,
    displayName: profile.displayName ?? null,
    profilePhoto: profile.profilePhoto ?? null,
  }
}
