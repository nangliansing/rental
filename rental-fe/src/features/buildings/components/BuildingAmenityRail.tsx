import { cn } from "@/lib/utils"

import {
  getBuildingAmenityIcon,
  getBuildingAmenityLabel,
} from "../utils/buildingAmenityDisplay"
import { normalizeStringArray } from "../utils/buildingSummaryDisplay"

type BuildingAmenityRailProps = {
  facilities?: readonly string[] | null
  security?: readonly string[] | null
  className?: string
}

export function BuildingAmenityRail({
  facilities,
  security,
  className,
}: BuildingAmenityRailProps) {
  const items = [
    ...normalizeStringArray(facilities),
    ...normalizeStringArray(security),
  ]

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Building facilities and security"
    >
      <div className="flex w-max min-w-full gap-4">
        {items.map((item) => {
          const Icon = getBuildingAmenityIcon(item)
          const label = getBuildingAmenityLabel(item)

          return (
            <div
              key={item}
              className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="max-w-[4.5rem] text-center text-[11px] font-medium leading-tight text-slate-600">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
