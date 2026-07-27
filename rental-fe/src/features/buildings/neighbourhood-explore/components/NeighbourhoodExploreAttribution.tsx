import { cn } from "@/lib/utils"

import { useNeighbourhoodExploreData } from "../NeighbourhoodExploreContext"
import { getNeighbourhoodTruncationHint } from "../utils/neighbourhoodExploreUi"

type NeighbourhoodExploreAttributionProps = {
  variant?: "overlay" | "footer"
}

export function NeighbourhoodExploreAttribution({
  variant = "overlay",
}: NeighbourhoodExploreAttributionProps) {
  const { neighbourhood } = useNeighbourhoodExploreData()
  const truncationHint = neighbourhood
    ? getNeighbourhoodTruncationHint(neighbourhood.summary)
    : null

  if (variant === "footer") {
    return (
      <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-2.5 text-center text-[11px] text-slate-400">
        {truncationHint ? `${truncationHint} · ` : null}
        Straight-line distances · © OpenStreetMap contributors
      </footer>
    )
  }

  return (
    <p
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-1.5 z-[5] text-center text-[10px] text-slate-500/90",
      )}
    >
      {truncationHint ? `${truncationHint} · ` : null}
      Straight-line distances · © OpenStreetMap
    </p>
  )
}
