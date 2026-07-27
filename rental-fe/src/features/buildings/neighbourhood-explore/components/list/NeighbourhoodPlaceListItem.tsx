import type { Ref } from "react"
import { memo, useCallback } from "react"

import { cn } from "@/lib/utils"

import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import { formatNeighbourhoodPlaceSubtitle } from "../../utils/formatNeighbourhoodPlaceSubtitle"
import { NeighbourhoodCategoryIcon } from "../NeighbourhoodCategoryIcon"

export type NeighbourhoodPlaceListItemProps = {
  place: NeighbourhoodPlace
  isActive: boolean
  onSelect: (placeId: string) => void
  className?: string
  itemRef?: Ref<HTMLButtonElement>
}

export const NeighbourhoodPlaceListItem = memo(function NeighbourhoodPlaceListItem({
  place,
  isActive,
  onSelect,
  className,
  itemRef,
}: NeighbourhoodPlaceListItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(place.id)
  }, [onSelect, place.id])

  return (
    <button
      ref={itemRef}
      type="button"
      data-place-id={place.id}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        isActive
          ? "border-slate-300 bg-slate-100"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50",
        className,
      )}
      onClick={handleSelect}
    >
      <NeighbourhoodCategoryIcon
        category={place.category}
        mode={place.mode}
        className="mt-0.5 h-8 w-8"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">
          {place.name}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {formatNeighbourhoodPlaceSubtitle(place)}
        </span>
      </span>
    </button>
  )
})
