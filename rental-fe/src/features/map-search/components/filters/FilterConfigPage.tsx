// src/features/map-search/components/filters/FilterConfigPage.tsx
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { ChevronDown, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BooleanOptionSelector } from "@/shared/components/inputs/BooleanOptionSelector"
import { MultiOptionSelector } from "@/shared/components/inputs/MultiOptionSelector"
import { RentRangeSlider } from "@/shared/components/inputs/RentRangeSlider"
import { SingleOptionSelector } from "@/shared/components/inputs/SingleOptionSelector"
import {
  BATHROOM_COUNT_OPTIONS,
  BEDROOM_COUNT_OPTIONS,
  BUILDING_FACILITY_OPTIONS,
  BUILDING_SECURITY_OPTIONS,
  BUILDING_TYPE_OPTIONS,
  CONTRACT_MONTH_OPTIONS,
  KITCHEN_TYPE_OPTIONS,
  LISTING_FACILITY_OPTIONS,
  OCCUPANCY_OPTIONS,
  SUPPORT_LANGUAGE_OPTIONS,
} from "@/shared/options/rental-options"

import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import type { MapSearchFilters } from "../../filters/types"

type FilterConfigPageProps = {
  className?: string
  showInlineHeader?: boolean
  onBack: () => void
  onApplied?: () => void
}

type FilterSectionProps = {
  title: string
  children: ReactNode
}

type AdvancedFilterSectionProps = FilterSectionProps & {
  count?: number
  isOpen: boolean
  onToggle: () => void
}

const BOOLEAN_FILTERS = [
  { label: "TM30 provided", key: "isTM30Provided" },
  { label: "Foreigner accepted", key: "isForeignerAccepted" },
  { label: "Cooking allowed", key: "isCookingAllowed" },
  { label: "Pet allowed", key: "isPetAllowed" },
] as const

const MULTI_OPTION_FILTERS = [
  {
    label: "Room facilities",
    key: "listingFacilities",
    options: LISTING_FACILITY_OPTIONS,
  },
  {
    label: "Building facilities",
    key: "buildingFacilities",
    options: BUILDING_FACILITY_OPTIONS,
  },
  {
    label: "Security",
    key: "security",
    options: BUILDING_SECURITY_OPTIONS,
  },
] as const

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <section className="relative border-t border-slate-100 pt-5">
      <div className="absolute -top-2.5 left-0 bg-white pr-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </p>
      </div>

      {children}
    </section>
  )
}

function AdvancedFilterSection({
  title,
  count = 0,
  isOpen,
  onToggle,
  children,
}: AdvancedFilterSectionProps) {
  return (
    <section className="border-t border-slate-100 first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="text-sm font-semibold text-slate-950">{title}</span>
          {count > 0 && (
            <span className="ml-2 rounded-full bg-slate-950 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {count}
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && <div className="pb-4">{children}</div>}
    </section>
  )
}

function getArrayCount(values?: string[]) {
  return values?.length ?? 0
}

export function FilterConfigPage({
  className,
  showInlineHeader = true,
  onBack,
  onApplied,
}: FilterConfigPageProps) {
  const { filters, applyFilters } = useMapSearchFilters()
  const [draftFilters, setDraftFilters] = useState<MapSearchFilters>(filters)
  const [openAdvancedSections, setOpenAdvancedSections] = useState({
    requirements: BOOLEAN_FILTERS.some((filter) => filters[filter.key] === true),
    building: filters.buildingType !== undefined,
    listingFacilities: getArrayCount(filters.listingFacilities) > 0,
    buildingFacilities: getArrayCount(filters.buildingFacilities) > 0,
    security: getArrayCount(filters.security) > 0,
  })

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  const toggleAdvancedSection = (section: keyof typeof openAdvancedSections) => {
    setOpenAdvancedSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  const updateFilter = <Key extends keyof MapSearchFilters>(
    key: Key,
    value: MapSearchFilters[Key]
  ) => {
    setDraftFilters((current) => {
      const nextFilters = { ...current }

      if (value === undefined) {
        delete nextFilters[key]
        return nextFilters
      }

      nextFilters[key] = value
      return nextFilters
    })
  }

  const handleApply = () => {
    applyFilters(draftFilters)
    onApplied?.()
  }

  const handleClear = () => {
    applyFilters({})
    onApplied?.()
  }

  const requirementCount = BOOLEAN_FILTERS.filter(
    (filter) => draftFilters[filter.key] === true,
  ).length
  const buildingCount = draftFilters.buildingType === undefined ? 0 : 1

  return (
    <div className={cn("pb-0", className)}>
      {showInlineHeader && (
        <div className="mb-5 flex items-center gap-3 px-1 pt-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Back"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <p className="font-semibold">Filters</p>
        </div>
      )}

      <div className="space-y-6 pb-28 pt-2">
        <FilterSection title="Price">
          <RentRangeSlider
            minRent={draftFilters.minRent}
            maxRent={draftFilters.maxRent}
            min={0}
            max={50000}
            step={500}
            onChange={(rentFilters) =>
              setDraftFilters((current) => ({
                ...current,
                ...rentFilters,
              }))
            }
          />
        </FilterSection>

        <FilterSection title="Support language">
          <MultiOptionSelector
            label="Language"
            options={SUPPORT_LANGUAGE_OPTIONS}
            value={draftFilters.supportLanguages}
            size="small"
            onChange={(value) => updateFilter("supportLanguages", value)}
          />
        </FilterSection>

        <FilterSection title="Room">
          <div className="space-y-4">
            <SingleOptionSelector
              label="Bedrooms"
              options={BEDROOM_COUNT_OPTIONS}
              value={draftFilters.bedroomCount}
              size="small"
              onChange={(bedroomCount) =>
                updateFilter("bedroomCount", bedroomCount as number | undefined)
              }
            />

            <SingleOptionSelector
              label="Bathrooms"
              options={BATHROOM_COUNT_OPTIONS}
              value={draftFilters.bathroomCount}
              size="small"
              onChange={(bathroomCount) =>
                updateFilter("bathroomCount", bathroomCount as number | undefined)
              }
            />

            <SingleOptionSelector
              label="Kitchen"
              options={KITCHEN_TYPE_OPTIONS}
              value={draftFilters.kitchenType}
              size="small"
              onChange={(kitchenType) =>
                updateFilter("kitchenType", kitchenType as string | undefined)
              }
            />

            <SingleOptionSelector
              label="Contract"
              options={CONTRACT_MONTH_OPTIONS}
              value={draftFilters.contractMonths}
              size="small"
              onChange={(contractMonths) =>
                updateFilter(
                  "contractMonths",
                  contractMonths as number | undefined
                )
              }
            />

            <SingleOptionSelector
              label="Occupancy"
              options={OCCUPANCY_OPTIONS}
              value={draftFilters.occupancy}
              size="small"
              onChange={(occupancy) =>
                updateFilter("occupancy", occupancy as number | undefined)
              }
            />
          </div>
        </FilterSection>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            More filters
          </p>

          <div className="mt-2">
            <AdvancedFilterSection
              title="Requirements"
              count={requirementCount}
              isOpen={openAdvancedSections.requirements}
              onToggle={() => toggleAdvancedSection("requirements")}
            >
              <div className="flex flex-wrap gap-2">
                {BOOLEAN_FILTERS.map((filter) => (
                  <BooleanOptionSelector
                    key={filter.key}
                    label={filter.label}
                    value={draftFilters[filter.key]}
                    size="small"
                    onChange={(value) => updateFilter(filter.key, value)}
                  />
                ))}
              </div>
            </AdvancedFilterSection>

            <AdvancedFilterSection
              title="Building type"
              count={buildingCount}
              isOpen={openAdvancedSections.building}
              onToggle={() => toggleAdvancedSection("building")}
            >
              <SingleOptionSelector
                options={BUILDING_TYPE_OPTIONS}
                value={draftFilters.buildingType}
                size="small"
                onChange={(buildingType) =>
                  updateFilter("buildingType", buildingType as string | undefined)
                }
              />
            </AdvancedFilterSection>

            {MULTI_OPTION_FILTERS.map((filter) => (
              <AdvancedFilterSection
                key={filter.key}
                title={filter.label}
                count={getArrayCount(draftFilters[filter.key])}
                isOpen={openAdvancedSections[filter.key]}
                onToggle={() => toggleAdvancedSection(filter.key)}
              >
                <MultiOptionSelector
                  options={filter.options}
                  value={draftFilters[filter.key]}
                  size="small"
                  onChange={(value) => updateFilter(filter.key, value)}
                />
              </AdvancedFilterSection>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-slate-100 bg-white/95 px-4 pb-[calc(0.5rem+4rem)] pt-2 backdrop-blur lg:pb-3">
          <Button
            className="h-11 flex-1 rounded-full bg-slate-950 text-white hover:bg-slate-800"
            onClick={handleApply}
          >
            Apply filters
          </Button>

          <Button
            variant="outline"
            className="h-11 rounded-full px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            onClick={handleClear}
          >
            Clear
          </Button>
      </div>
    </div>
  )
}
