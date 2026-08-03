import { useEffect, useRef } from "react"

import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"
import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import { normalizeProfileDisplayName } from "@/features/profile/utils/profileDisplayUtils"
import { toast } from "@/hooks/use-toast"

import { useMapSearchFilters } from "../../context/MapSearchFilterContext"

type ListerMapSearchArrivalToastProps = {
  isSearchIdle: boolean
  listerSeed: ListerMapSearchSeed | null
}

export function ListerMapSearchArrivalToast({
  isSearchIdle,
  listerSeed,
}: ListerMapSearchArrivalToastProps) {
  const { selectedListers, selectedListerIds, submittedFilters } =
    useMapSearchFilters()
  const hasShownRef = useRef(false)

  useEffect(() => {
    if (!isSearchIdle || hasShownRef.current) return

    const agentProfileIds = extractAgentProfileIds(submittedFilters)
    if (agentProfileIds.length === 0) return

    const selectedIdSet = new Set(selectedListerIds)
    const hasPendingHydration = agentProfileIds.some(
      (id) => !selectedIdSet.has(id),
    )

    if (!listerSeed && hasPendingHydration) return

    const primaryListerId = agentProfileIds[0]
    const matchingSelectedLister = selectedListers.find(
      (lister) => lister._id === primaryListerId,
    )

    const displayName = normalizeProfileDisplayName(
      listerSeed?.displayName ??
        matchingSelectedLister?.displayName ??
        "this lister",
      "Lister",
    )

    toast({
      title: `Search an area to see ${displayName}'s listings`,
      variant: "search-hint",
    })
    hasShownRef.current = true
  }, [
    isSearchIdle,
    listerSeed,
    selectedListerIds,
    selectedListers,
    submittedFilters,
  ])

  return null
}
