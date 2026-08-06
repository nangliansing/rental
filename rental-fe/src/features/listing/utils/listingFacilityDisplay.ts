import type { LucideIcon } from "lucide-react"
import {
  AirVent,
  Armchair,
  Bath,
  BedDouble,
  CircleDot,
  CookingPot,
  Fan,
  Heater,
  LampDesk,
  Microwave,
  Refrigerator,
  Shirt,
  Sofa,
  Tv,
  WashingMachine,
  Wifi,
  DoorOpen,
} from "lucide-react"

import { LISTING_FACILITY_OPTIONS } from "@/shared/options/rental-options"

const FACILITY_ICON_BY_VALUE: Record<string, LucideIcon> = {
  Wifi,
  TV: Tv,
  "Air Conditioner": AirVent,
  Fan,
  Refrigerator,
  Microwave,
  "Washing Machine": WashingMachine,
  "Water Heater": Heater,
  Desk: LampDesk,
  Chair: Armchair,
  Wardrobe: Shirt,
  Bed: BedDouble,
  Sofa,
  Balcony: DoorOpen,
  "Private Bathroom": Bath,
  "Cooking Equipment": CookingPot,
}

const FACILITY_LABELS = new Map(
  LISTING_FACILITY_OPTIONS.map((option) => [option.value, option.label]),
)

const FACILITY_VALUE_BY_NORMALIZED = new Map(
  LISTING_FACILITY_OPTIONS.map((option) => [
    normalizeFacilityKey(option.value),
    option.value,
  ]),
)

function normalizeFacilityKey(value: string) {
  return value.trim().toLowerCase()
}

/** Trim, drop empties/non-strings, dedupe case-insensitively, prefer catalog values. */
export function normalizeListingFacilities(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const facilities: string[] = []

  for (const item of value) {
    if (typeof item !== "string") continue
    const trimmed = item.trim()
    if (!trimmed) continue

    const key = normalizeFacilityKey(trimmed)
    if (seen.has(key)) continue
    seen.add(key)

    facilities.push(FACILITY_VALUE_BY_NORMALIZED.get(key) ?? trimmed)
  }

  return facilities
}

export function getListingFacilityLabel(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const direct = FACILITY_LABELS.get(trimmed)
  if (direct) return direct

  const canonical = FACILITY_VALUE_BY_NORMALIZED.get(
    normalizeFacilityKey(trimmed),
  )
  if (canonical) return FACILITY_LABELS.get(canonical) ?? canonical

  return trimmed
}

export function getListingFacilityIcon(value: string): LucideIcon {
  const trimmed = value.trim()
  const directMatch = FACILITY_ICON_BY_VALUE[trimmed]
  if (directMatch) return directMatch

  const canonical = FACILITY_VALUE_BY_NORMALIZED.get(
    normalizeFacilityKey(trimmed),
  )
  if (canonical) {
    const canonicalIcon = FACILITY_ICON_BY_VALUE[canonical]
    if (canonicalIcon) return canonicalIcon
  }

  const normalized = normalizeFacilityKey(trimmed)
  const matchedEntry = Object.entries(FACILITY_ICON_BY_VALUE).find(
    ([key]) => normalizeFacilityKey(key) === normalized,
  )

  return matchedEntry?.[1] ?? CircleDot
}
