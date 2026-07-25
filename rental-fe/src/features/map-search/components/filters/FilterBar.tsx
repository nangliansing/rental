import { useMemo, type Ref } from "react"

import { cn } from "@/lib/utils"

import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { buildFilterChips } from "../../filters/buildFilterChips"
import { FilterChipButton } from "./FilterChipButton"

type FilterBarProps = {
  className?: string
  onOpenFilters: () => void
  triggerRef?: Ref<HTMLButtonElement>
}

export function FilterBar({
  className,
  onOpenFilters,
  triggerRef,
}: FilterBarProps) {
  const { filters, removeFilter } = useMapSearchFilters()
  const chips = useMemo(() => buildFilterChips(filters), [filters])

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChipButton
          isPrimary
          activeCount={chips.length}
          onClick={onOpenFilters}
          buttonRef={triggerRef}
        />

        {chips.map((chip) => (
          <FilterChipButton
            key={chip.key}
            chip={chip}
            onRemove={() => removeFilter(chip)}
          />
        ))}
      </div>
    </div>
  )
}
