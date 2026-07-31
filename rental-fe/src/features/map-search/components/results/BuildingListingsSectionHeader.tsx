import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { BUILDING_DETAIL_LISTINGS_HEADING_CLASS } from "../../utils/building-list-layout"

type BuildingListingsSectionHeaderProps = {
  totalListings: number
  isRefreshing?: boolean
  className?: string
}

export function BuildingListingsSectionHeader({
  totalListings,
  isRefreshing = false,
  className,
}: BuildingListingsSectionHeaderProps) {
  return (
    <div
      className={cn(BUILDING_DETAIL_LISTINGS_HEADING_CLASS, className)}
      {...(isRefreshing ? { role: "status", "aria-live": "polite" as const } : {})}
    >
      <span>{totalListings} available listings</span>
      <div className="flex min-h-[0.875rem] min-w-[0.875rem] items-center justify-end">
        {isRefreshing ? (
          <>
            <LoaderIcon
              className="h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="sr-only">Updating listings</span>
          </>
        ) : null}
      </div>
    </div>
  )
}
