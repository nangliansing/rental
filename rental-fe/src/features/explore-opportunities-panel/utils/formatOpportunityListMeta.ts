import type { AgentDemandOpportunity } from "@/features/agent-demand-opportunity/api"
import { formatBedroom } from "@/features/listing/utils/listingDisplay"
import type { SavedSearchFilters } from "@/features/saved-search/api"
import {
  formatSavedSearchGeoPreview,
  formatSavedSearchListTimestamp,
} from "@/features/saved-search/components/formatSavedSearchListMeta"
import { formatFlexibleDateOnlyLabel } from "@/shared/dates/calendarDate"

export type OpportunityListCue =
  | {
      kind: "bedroom"
      value: number
      /** Accessible + Studio text when value is 0. */
      label: string
    }
  | {
      kind: "contract"
      value: number
      label: string
    }
  | {
      kind: "occupancy"
      value: number
      label: string
    }
  | {
      kind: "rent"
      label: string
    }

export function formatOpportunityListTitle(
  opportunity: Pick<AgentDemandOpportunity, "geoSearch">,
): string {
  return formatSavedSearchGeoPreview(opportunity.geoSearch)
}

/** Compact first-sight cues for icon+value rendering. */
export function buildOpportunityListCues(
  opportunity: Pick<AgentDemandOpportunity, "filters">,
): OpportunityListCue[] {
  return buildOpportunityFilterCues(opportunity.filters)
}

/** Single place for opportunity move-in copy; returns null when absent/invalid. */
export function formatOpportunityMoveInLabel(
  availableBy: unknown,
): string | null {
  const dateLabel = formatFlexibleDateOnlyLabel(availableBy)
  if (!dateLabel) return null
  return `Wants to move in by ${dateLabel}`
}

export function formatOpportunityListTimestamp(
  opportunity: Pick<AgentDemandOpportunity, "lastConfirmedAt" | "createdAt">,
): string {
  return formatSavedSearchListTimestamp(
    opportunity.lastConfirmedAt ?? opportunity.createdAt,
  )
}

function buildOpportunityFilterCues(
  filters: SavedSearchFilters,
): OpportunityListCue[] {
  const cues: OpportunityListCue[] = []
  const { minRent, maxRent, bedroomCount, contractMonths, occupancy } = filters

  if (typeof bedroomCount === "number" && Number.isFinite(bedroomCount)) {
    cues.push({
      kind: "bedroom",
      value: bedroomCount,
      label: formatBedroom(bedroomCount),
    })
  }

  if (typeof contractMonths === "number" && Number.isFinite(contractMonths)) {
    cues.push({
      kind: "contract",
      value: contractMonths,
      label:
        contractMonths === 1 ? "1 month" : `${contractMonths} months`,
    })
  }

  if (typeof occupancy === "number" && Number.isFinite(occupancy)) {
    cues.push({
      kind: "occupancy",
      value: occupancy,
      label: occupancy === 1 ? "1 person" : `${occupancy} people`,
    })
  }

  const rentLabel = formatOpportunityRentLabel(minRent, maxRent)
  if (rentLabel) {
    cues.push({ kind: "rent", label: rentLabel })
  }

  return cues
}

function formatOpportunityRentLabel(
  minRent: number | undefined,
  maxRent: number | undefined,
): string | null {
  if (typeof minRent !== "number" && typeof maxRent !== "number") {
    return null
  }

  const min =
    typeof minRent === "number" ? formatOpportunityCompactRent(minRent) : null
  const max =
    typeof maxRent === "number" ? formatOpportunityCompactRent(maxRent) : null

  if (min && max) return `${min}–${max}`
  if (min) return `from ${min}`
  if (max) return `up to ${max}`
  return null
}

function formatOpportunityCompactRent(value: number): string {
  if (value >= 1000) {
    return `฿${Math.round(value / 1000)}k`
  }
  return `฿${value}`
}
