import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { getBuildingMarkerClassName } from "../BuildingMarkerLayer"

export function BuildingMarkerButton({
  children,
  className,
  isSelected = false,
  isHovered = false,
  isListingOnly = false,
  ariaPressed,
  ariaCurrent,
  onSelect,
}: {
  children: ReactNode
  className?: string
  isSelected?: boolean
  isHovered?: boolean
  isListingOnly?: boolean
  ariaPressed?: boolean
  ariaCurrent?: boolean | "true"
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={ariaPressed}
      aria-current={ariaCurrent}
      className={cn(
        getBuildingMarkerClassName({
          isSelected,
          isHovered,
          isListingOnly,
        }),
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      {children}
    </button>
  )
}
