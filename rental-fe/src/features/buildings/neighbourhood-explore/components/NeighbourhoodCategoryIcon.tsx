import { cn } from "@/lib/utils"

import type { NeighbourhoodCategoryKey } from "../../api/getBuildingNeighbourhood"
import { getNeighbourhoodPlacePinDisplay } from "../utils/neighbourhoodPlacePinDisplay"

type NeighbourhoodCategoryIconProps = {
  category: NeighbourhoodCategoryKey
  className?: string
  iconClassName?: string
  size?: number
}

export function NeighbourhoodCategoryIcon({
  category,
  className,
  iconClassName = "h-4 w-4",
  size,
}: NeighbourhoodCategoryIconProps) {
  const { color, Icon } = getNeighbourhoodPlacePinDisplay(category)

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border bg-white",
        className,
      )}
      style={{ borderColor: color }}
    >
      <Icon
        aria-hidden="true"
        className={iconClassName}
        style={{ color }}
        size={size}
        strokeWidth={2.25}
      />
    </span>
  )
}
