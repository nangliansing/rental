import { useEffect, useRef } from "react"

import { getListerProfileById } from "@/features/agent/api/getListerProfileById"
import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"
import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import {
  listerProfileToSearchAgentProfile,
  toSearchAgentProfileFromSeed,
} from "@/features/agent/lister-map-search/toSearchAgentProfile"
import { isListerMapSearchSeedMatchingIds } from "@/features/agent/lister-map-search/navigationState"
import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

type UseHydrateSelectedListersInput = {
  filters: MapSearchFilters
  listerSeed: ListerMapSearchSeed | null
  selectedListerIds: string[]
  hydrateSelectedListers: (listers: SearchAgentProfile[]) => void
}

export function useHydrateSelectedListers({
  filters,
  listerSeed,
  selectedListerIds,
  hydrateSelectedListers,
}: UseHydrateSelectedListersInput) {
  const hydrateSelectedListersRef = useRef(hydrateSelectedListers)
  hydrateSelectedListersRef.current = hydrateSelectedListers

  useEffect(() => {
    const agentProfileIds = extractAgentProfileIds(filters)
    const selectedIdSet = new Set(
      selectedListerIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    const missingIds = agentProfileIds.filter((id) => !selectedIdSet.has(id))

    if (missingIds.length === 0) return

    const abortController = new AbortController()
    const pendingListers: SearchAgentProfile[] = []

    if (
      listerSeed &&
      isListerMapSearchSeedMatchingIds(listerSeed, missingIds)
    ) {
      pendingListers.push(toSearchAgentProfileFromSeed(listerSeed))
    }

    const idsToFetch = missingIds.filter(
      (id) => !pendingListers.some((lister) => lister._id === id),
    )

    if (pendingListers.length > 0) {
      hydrateSelectedListersRef.current(pendingListers)
    }

    if (idsToFetch.length === 0) return () => abortController.abort()

    void (async () => {
      const fetchedListers: SearchAgentProfile[] = []

      for (const agentProfileId of idsToFetch) {
        if (abortController.signal.aborted) return

        try {
          const profile = await getListerProfileById(
            agentProfileId,
            abortController.signal,
          )
          fetchedListers.push(listerProfileToSearchAgentProfile(profile))
        } catch {
          // Ignore missing or failed profiles; URL filter still applies.
        }
      }

      if (!abortController.signal.aborted && fetchedListers.length > 0) {
        hydrateSelectedListersRef.current(fetchedListers)
      }
    })()

    return () => abortController.abort()
  }, [filters, listerSeed, selectedListerIds])
}
