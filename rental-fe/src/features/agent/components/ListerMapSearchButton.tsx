import { Search } from "lucide-react"
import { Link } from "react-router-dom"

import { normalizeProfileDisplayName } from "@/features/profile/utils/profileDisplayUtils"
import { PROFILE_ICON_BUTTON_CLASS } from "@/features/profile/utils/profileLayoutStyles"

import { buildListerMapSearchUrl } from "../lister-map-search/buildListerMapSearchUrl"
import { createListerMapSearchNavigationState } from "../lister-map-search/navigationState"
import { toListerMapSearchSeed } from "../lister-map-search/toListerMapSearchSeed"
import type { ListerMapSearchSeed } from "../lister-map-search/types"

type ListerMapSearchButtonProps = {
  lister: ListerMapSearchSeed
  activeListingCount: number
}

export function ListerMapSearchButton({
  lister,
  activeListingCount,
}: ListerMapSearchButtonProps) {
  const seed = toListerMapSearchSeed(lister)

  if (!seed || activeListingCount <= 0) return null

  const displayName = normalizeProfileDisplayName(seed.displayName, "Lister")

  return (
    <Link
      to={buildListerMapSearchUrl(seed._id)}
      state={createListerMapSearchNavigationState(seed)}
      className={PROFILE_ICON_BUTTON_CLASS}
      aria-label={`Search ${displayName}'s listings on map`}
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </Link>
  )
}
