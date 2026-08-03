import type { ListingMedia } from "@/features/map-search/types"

export type ListerMapSearchSeed = {
  _id: string
  displayName: string | null
  profilePhoto: ListingMedia | null
}
