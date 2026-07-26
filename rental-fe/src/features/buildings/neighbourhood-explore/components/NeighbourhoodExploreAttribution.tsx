import { cn } from "@/lib/utils"

import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"

type NeighbourhoodExploreAttributionProps = {
  variant?: "overlay" | "footer"
}

function getTruncationHint(
  summary: NonNullable<
    ReturnType<typeof useNeighbourhoodExplore>["neighbourhood"]
  >["summary"],
) {
  if (!summary.truncated) {
    return null
  }

  if (summary.totalWithinRadius != null && summary.totalWithinRadius > summary.all) {
    return `Showing ${summary.all} of ${summary.totalWithinRadius} nearby places`
  }

  return "Showing closest places only"
}

export function NeighbourhoodExploreAttribution({
  variant = "overlay",
}: NeighbourhoodExploreAttributionProps) {
  const { neighbourhood } = useNeighbourhoodExplore()
  const truncationHint = neighbourhood
    ? getTruncationHint(neighbourhood.summary)
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
