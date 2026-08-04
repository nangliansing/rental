// src/features/map-search/components/filters/FilterConfigPage.tsx
import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import type { MapSearchFilters } from "../../filters/types"
import { MapSearchFiltersForm } from "./MapSearchFiltersForm"

type FilterConfigPageProps = {
  className?: string
  showInlineHeader?: boolean
  onBack: () => void
  onApplied?: () => void
}

export function FilterConfigPage({
  className,
  showInlineHeader = true,
  onBack,
  onApplied,
}: FilterConfigPageProps) {
  const { filters, applyFilters } = useMapSearchFilters()
  const [draftFilters, setDraftFilters] = useState<MapSearchFilters>(filters)

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  const handleApply = () => {
    applyFilters(draftFilters)
    onApplied?.()
  }

  const handleClear = () => {
    applyFilters({})
    onApplied?.()
  }

  return (
    <div className={cn("pb-0", className)}>
      {showInlineHeader && (
        <div className="mb-5 flex items-center gap-3 px-1 pt-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Back"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <p className="font-semibold">Filters</p>
        </div>
      )}

      <MapSearchFiltersForm
        value={draftFilters}
        onChange={setDraftFilters}
        className="pb-28"
      />

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-slate-100 bg-white/95 px-4 pb-[calc(0.5rem+4rem)] pt-2 backdrop-blur lg:pb-3">
        <Button
          className="h-11 flex-1 rounded-full bg-slate-950 text-white hover:bg-slate-800"
          onClick={handleApply}
        >
          Apply filters
        </Button>

        <Button
          variant="outline"
          className="h-11 rounded-full px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
