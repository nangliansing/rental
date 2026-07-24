import { Building2, MapPin, PencilLine, Plus, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCompactBaht } from "@/features/map-search/utils/building-display"

export type BuildingSummaryData = {
  name: string
  buildingType?: string | null
  address?: string | null
  facilities?: readonly string[] | null
  security?: readonly string[] | null
  minRent?: number | null
  maxRent?: number | null
  location?: {
    coordinates?: readonly number[] | null
  } | null
}

type BuildingSummaryCardProps = {
  building: BuildingSummaryData
  variant?: "panel" | "contained"
  titleLevel?: 1 | 2 | 3
  canCreateListing?: boolean
  hideEmptyRent?: boolean
  showCoordinates?: boolean
  editLabel?: string
  className?: string
  onListHere?: () => void
  onRequestEdit?: () => void
}

function formatBuildingRent(building: BuildingSummaryData) {
  if (building.minRent == null) return "No rent yet"

  if (building.maxRent == null || building.maxRent === building.minRent) {
    return formatCompactBaht(building.minRent) + "+"
  }

  return (
    formatCompactBaht(building.minRent) +
    " - " +
    formatCompactBaht(building.maxRent)
  )
}

function getCoordinates(building: BuildingSummaryData) {
  const coordinates = building.location?.coordinates
  const lng = coordinates?.[0]
  const lat = coordinates?.[1]

  if (
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    typeof lat !== "number" ||
    !Number.isFinite(lat)
  ) {
    return null
  }

  return { lat, lng }
}

export function BuildingSummaryCard({
  building,
  variant = "panel",
  titleLevel = 1,
  canCreateListing = false,
  hideEmptyRent = false,
  showCoordinates = false,
  editLabel = "Request building edit",
  className,
  onListHere,
  onRequestEdit,
}: BuildingSummaryCardProps) {
  const facilities = Array.isArray(building.facilities)
    ? building.facilities
    : []
  const security = Array.isArray(building.security) ? building.security : []
  const coordinates = showCoordinates ? getCoordinates(building) : null
  const shouldShowRent = building.minRent != null || !hideEmptyRent
  const hasActions = Boolean(onRequestEdit) ||
    (canCreateListing && Boolean(onListHere))
  const Title = `h${titleLevel}` as "h1" | "h2" | "h3"

  return (
    <section
      className={cn(
        variant === "panel"
          ? "border-b border-slate-100 px-4 pb-4"
          : "rounded-xl border border-slate-200 bg-white p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Title className="truncate text-lg font-semibold leading-tight text-slate-950">
            {building.name}
          </Title>

          {building.buildingType && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-500">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{building.buildingType}</span>
            </div>
          )}
        </div>

        {shouldShowRent && (
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-sm font-semibold",
                building.minRent == null
                  ? "text-slate-400"
                  : "text-slate-950",
              )}
            >
              {formatBuildingRent(building)}
            </p>
          </div>
        )}
      </div>

      {building.address && (
        <div className="mt-3 flex gap-2 text-sm leading-5 text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="line-clamp-2">{building.address}</p>
        </div>
      )}

      {coordinates && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          Lat {coordinates.lat.toFixed(5)}, Lng {coordinates.lng.toFixed(5)}
        </p>
      )}

      {(facilities.length > 0 || security.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {facilities.slice(0, 4).map((facility) => (
            <span
              key={facility}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {facility}
            </span>
          ))}

          {security.slice(0, 2).map((securityItem) => (
            <span
              key={securityItem}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              <ShieldCheck className="h-3 w-3" />
              {securityItem}
            </span>
          ))}
        </div>
      )}

      {hasActions && (
        <div className="mt-4 flex items-center gap-2">
          {canCreateListing && onListHere && (
            <button
              type="button"
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={onListHere}
            >
              <Plus className="h-4 w-4" />
              <span className="truncate">List a room here</span>
            </button>
          )}

          {onRequestEdit && (
            <div className="group relative shrink-0">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                onClick={onRequestEdit}
                aria-label={editLabel}
              >
                <PencilLine className="h-4 w-4" />
              </button>

              <span
                className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus-within:block"
                role="tooltip"
              >
                {editLabel}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
