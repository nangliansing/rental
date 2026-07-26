import { X } from "lucide-react"

import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import { NeighbourhoodRadiusSelect } from "./NeighbourhoodRadiusSelect"

type NeighbourhoodExploreHeaderProps = {
  onClose: () => void
}

export function NeighbourhoodExploreHeader({
  onClose,
}: NeighbourhoodExploreHeaderProps) {
  const { radiusMeters, setRadius } = useNeighbourhoodExplore()

  return (
    <header className="shrink-0 border-b border-slate-100/80 px-5 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">
            Explore neighbourhood
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            What&apos;s nearby this building
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <NeighbourhoodRadiusSelect
            value={radiusMeters}
            onChange={setRadius}
          />

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close explore neighbourhood"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
