import { Building2, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { BuildingFollowControl } from "@/features/building-follow/components/BuildingFollowControl"
import { cn } from "@/lib/utils"

import { BuildingAmenityRail } from "./BuildingAmenityRail"
import { BuildingSummaryActionBar } from "./BuildingSummaryActionBar"
import { useBuildingSummaryActions } from "../hooks/useBuildingSummaryActions"
import {
  formatBuildingSummaryRent,
  getBuildingDetailPath,
  normalizeBuildingSummary,
  type BuildingSummaryData,
} from "../utils/buildingSummaryDisplay"

export type { BuildingSummaryData } from "../utils/buildingSummaryDisplay"

type BuildingSummaryCardProps = {
  building: BuildingSummaryData
  variant?: "panel" | "contained" | "embedded"
  titleLevel?: 1 | 2 | 3
  hideActions?: boolean
  hideEmptyRent?: boolean
  showCoordinates?: boolean
  editLabel?: string
  className?: string
  onEditDraft?: () => void
  editDraftLabel?: string
  onListHere?: () => void
  onRequestEdit?: () => void
  onExploreNeighbourhood?: (trigger: HTMLButtonElement) => void
  isExploreOpen?: boolean
  showFollowAction?: boolean
}

const VARIANT_CLASS_NAME = {
  panel: "border-b border-slate-100 px-4 pb-4",
  contained: "rounded-xl border border-slate-200 bg-white p-4",
  embedded: "",
} as const

export function BuildingSummaryCard({
  building,
  variant = "panel",
  titleLevel = 1,
  hideActions = false,
  hideEmptyRent = false,
  showCoordinates = false,
  editLabel = "Request building edit",
  className,
  onEditDraft,
  editDraftLabel = "Edit building",
  onListHere,
  onRequestEdit,
  onExploreNeighbourhood,
  isExploreOpen = false,
  showFollowAction = true,
}: BuildingSummaryCardProps) {
  const summary = normalizeBuildingSummary(building, { showCoordinates })
  const {
    handleListHere,
    handleRequestEdit,
    hasManagementActions,
  } = useBuildingSummaryActions({
    buildingId: summary.id,
    hideActions,
    onListHere,
    onRequestEdit,
  })
  const shouldShowRent = summary.minRent != null || !hideEmptyRent
  const Title = `h${titleLevel}` as "h1" | "h2" | "h3"
  const buildingDetailPath = getBuildingDetailPath(summary.id)

  return (
    <section
      className={cn(VARIANT_CLASS_NAME[variant], className)}
      aria-label={`Building summary for ${summary.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Title className="min-w-0 truncate text-lg font-semibold leading-tight text-slate-950">
              {buildingDetailPath ? (
                <Link
                  to={buildingDetailPath}
                  className="truncate text-inherit transition-colors hover:text-slate-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2"
                >
                  {summary.name}
                </Link>
              ) : (
                summary.name
              )}
            </Title>
            {showFollowAction && summary.id && (
              <BuildingFollowControl
                buildingId={summary.id}
                initialIsFollowing={Boolean(building.isFollowing)}
              />
            )}
          </div>

          {summary.buildingType && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-500">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{summary.buildingType}</span>
            </div>
          )}
        </div>

        {shouldShowRent && (
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-sm font-semibold",
                summary.minRent == null ? "text-slate-400" : "text-slate-950",
              )}
            >
              {formatBuildingSummaryRent(summary.minRent, summary.maxRent)}
            </p>
          </div>
        )}
      </div>

      {summary.address && (
        <div className="mt-3 flex gap-2 text-sm leading-5 text-slate-600">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <p className="line-clamp-2">{summary.address}</p>
        </div>
      )}

      {summary.coordinates && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Lat {summary.coordinates.lat.toFixed(5)}, Lng{" "}
          {summary.coordinates.lng.toFixed(5)}
        </p>
      )}

      <BuildingAmenityRail
        facilities={summary.facilities}
        security={summary.security}
        className="mt-3"
        onExploreNeighbourhood={onExploreNeighbourhood}
        isExploreOpen={isExploreOpen}
      />

      <BuildingSummaryActionBar
        editLabel={editLabel}
        draftEditLabel={editDraftLabel}
        hasManagementActions={hasManagementActions}
        hasDraftEditAction={Boolean(onEditDraft)}
        onListHere={handleListHere}
        onRequestEdit={handleRequestEdit}
        onEditDraft={onEditDraft}
      />
    </section>
  )
}
