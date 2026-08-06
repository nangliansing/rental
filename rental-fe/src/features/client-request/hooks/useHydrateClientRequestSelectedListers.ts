import { useEffect, useRef } from "react"

import { getListerProfileById } from "@/features/agent/api/getListerProfileById"
import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"
import { listerProfileToSearchAgentProfile } from "@/features/agent/lister-map-search/toSearchAgentProfile"
import type { SearchAgentProfile } from "@/features/agent"
import type { MapSearchFilters } from "@/features/map-search/filters/types"

type UseHydrateClientRequestSelectedListersInput = {
  enabled: boolean
  filters: MapSearchFilters
  onHydrated: (listers: SearchAgentProfile[]) => void
}

/** Load profile cards for `filters.agentProfileIds` (wizard draft or detail view). */
export function useHydrateClientRequestSelectedListers({
  enabled,
  filters,
  onHydrated,
}: UseHydrateClientRequestSelectedListersInput) {
  const onHydratedRef = useRef(onHydrated)
  onHydratedRef.current = onHydrated

  const agentProfileIdsKey = extractAgentProfileIds(filters).join(",")

  useEffect(() => {
    if (!enabled) return

    const agentProfileIds = agentProfileIdsKey
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)

    if (agentProfileIds.length === 0) {
      onHydratedRef.current([])
      return
    }

    const abortController = new AbortController()

    void (async () => {
      const fetched: SearchAgentProfile[] = []

      for (const agentProfileId of agentProfileIds) {
        if (abortController.signal.aborted) return

        try {
          const profile = await getListerProfileById(
            agentProfileId,
            abortController.signal,
          )
          fetched.push(listerProfileToSearchAgentProfile(profile))
        } catch {
          // Keep going; missing profiles can still be re-added via search.
        }
      }

      if (!abortController.signal.aborted) {
        onHydratedRef.current(fetched)
      }
    })()

    return () => abortController.abort()
  }, [agentProfileIdsKey, enabled])
}
