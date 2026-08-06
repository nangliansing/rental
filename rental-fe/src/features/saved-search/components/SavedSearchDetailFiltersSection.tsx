import {
  Bath,
  Bed,
  Building2,
  CalendarDays,
  CookingPot,
  DollarSign,
  FileCheck,
  Languages,
  PawPrint,
  ShieldCheck,
  Snowflake,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { SavedSearchFilters } from "@/features/saved-search/api"
import { buildFilterChips } from "@/features/map-search/filters/buildFilterChips"
import type { FilterChip } from "@/features/map-search/filters/types"

import { SavedSearchDetailCollapsibleSection } from "./SavedSearchDetailCollapsibleSection"

type SavedSearchDetailFiltersSectionProps = {
  filters: SavedSearchFilters
}

const FILTER_CHIP_ICONS = {
  price: DollarSign,
  aircon: Snowflake,
  tm30: FileCheck,
  pet: PawPrint,
  cooking: CookingPot,
  building: Building2,
  contract: CalendarDays,
  occupancy: Users,
  security: ShieldCheck,
  language: Languages,
  bed: Bed,
  bath: Bath,
} satisfies Record<NonNullable<FilterChip["icon"]>, LucideIcon>

function ReadOnlyFilterChip({ chip }: { chip: FilterChip }) {
  const Icon = chip.icon ? FILTER_CHIP_ICONS[chip.icon] : null

  return (
    <span className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm">
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{chip.label}</span>
    </span>
  )
}

function formatPreferencesSummary(chipCount: number): string {
  if (chipCount <= 0) return "None set"
  if (chipCount === 1) return "1 filter"
  return `${chipCount} filters`
}

/** Collapsible read-only preference chips for the saved-search detail pane. */
export function SavedSearchDetailFiltersSection({
  filters,
}: SavedSearchDetailFiltersSectionProps) {
  const chips = buildFilterChips(filters)

  return (
    <SavedSearchDetailCollapsibleSection
      title="Preferences"
      defaultOpen={false}
      collapsedSummary={formatPreferencesSummary(chips.length)}
    >
      {chips.length === 0 ? (
        <p className="text-sm leading-6 text-slate-500">
          No preference filters were saved with this search.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <ReadOnlyFilterChip key={chip.key} chip={chip} />
          ))}
        </div>
      )}
    </SavedSearchDetailCollapsibleSection>
  )
}
