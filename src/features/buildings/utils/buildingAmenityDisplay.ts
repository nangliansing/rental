import type { LucideIcon } from "lucide-react"
import {
  AlarmSmoke,
  ArrowUpDown,
  BellRing,
  Car,
  Cctv,
  CircleDot,
  DoorOpen,
  Dumbbell,
  Fence,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  WashingMachine,
  Waves,
} from "lucide-react"

import {
  BUILDING_FACILITY_OPTIONS,
  BUILDING_SECURITY_OPTIONS,
} from "@/shared/options/rental-options"

const AMENITY_ICON_BY_VALUE: Record<string, LucideIcon> = {
  Parking: Car,
  Lift: ArrowUpDown,
  Laundry: WashingMachine,
  Gym: Dumbbell,
  "Swimming Pool": Waves,
  CCTV: Cctv,
  "Security Guard": ShieldCheck,
  "Keycard Access": KeyRound,
  "Access Control": LockKeyhole,
  "Gated Entrance": Fence,
  "Fire Alarm": BellRing,
  "Smoke Detector": AlarmSmoke,
  "Emergency Exit": DoorOpen,
}

const AMENITY_LABELS = new Map(
  [...BUILDING_FACILITY_OPTIONS, ...BUILDING_SECURITY_OPTIONS].map((option) => [
    option.value,
    option.label,
  ]),
)

function normalizeAmenityKey(value: string) {
  return value.trim().toLowerCase()
}

export function getBuildingAmenityLabel(value: string) {
  const trimmed = value.trim()
  return AMENITY_LABELS.get(trimmed) ?? trimmed
}

export function getBuildingAmenityIcon(value: string): LucideIcon {
  const trimmed = value.trim()
  const directMatch = AMENITY_ICON_BY_VALUE[trimmed]
  if (directMatch) return directMatch

  const normalized = normalizeAmenityKey(trimmed)
  const matchedEntry = Object.entries(AMENITY_ICON_BY_VALUE).find(
    ([key]) => normalizeAmenityKey(key) === normalized,
  )

  return matchedEntry?.[1] ?? CircleDot
}
