import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  NEIGHBOURHOOD_RADIUS_OPTIONS,
  type NeighbourhoodRadiusMeters,
} from "../../constants/neighbourhood"

type NeighbourhoodRadiusSelectProps = {
  value: NeighbourhoodRadiusMeters
  onChange: (value: string) => void
  className?: string
}

export function NeighbourhoodRadiusSelect({
  value,
  onChange,
  className,
}: NeighbourhoodRadiusSelectProps) {
  const activeLabel =
    NEIGHBOURHOOD_RADIUS_OPTIONS.find((option) => option.value === value)
      ?.label ?? "1 km"

  return (
    <label
      className={cn(
        "relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100",
        className,
      )}
    >
      <span className="text-slate-500">Radius</span>
      <span>{activeLabel}</span>
      <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />

      <select
        aria-label="Search radius"
        value={String(value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        onChange={(event) => onChange(event.target.value)}
      >
        {NEIGHBOURHOOD_RADIUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
