// src/features/map-search/components/filters/FilterChipButton.tsx

import type { ComponentType, Ref } from "react"
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
    SlidersHorizontal,
    Snowflake,
    Users,
    X,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type { FilterChip } from "../../filters/types"

type FilterChipButtonProps = {
    chip?: FilterChip
    isPrimary?: boolean
    activeCount?: number
    onClick?: () => void
    onRemove?: () => void
    buttonRef?: Ref<HTMLButtonElement>
}

const iconMap = {
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
} satisfies Record<
    NonNullable<FilterChip["icon"]>,
    ComponentType<{ className?: string }>
>

function FilterChipIcon({ icon }: { icon?: FilterChip["icon"] }) {
    if (!icon) return null

    const Icon = iconMap[icon]
    return <Icon className="h-3.5 w-3.5" />
}

const chipClassName =
    "flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm hover:bg-slate-50"

export function FilterChipButton({
    chip,
    isPrimary = false,
    activeCount = 0,
    onClick,
    onRemove,
    buttonRef,
}: FilterChipButtonProps) {
    if (isPrimary) {
        return (
            <button
                ref={buttonRef}
                type="button"
                data-map-filter-trigger
                className={chipClassName}
                onClick={onClick}
            >
                <SlidersHorizontal className="h-4 w-4" />
                Filters

                {activeCount > 0 && (
                    <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-xs text-white">
                        {activeCount}
                    </span>
                )}
            </button>
        )
    }

    if (!chip) return null

    return (
        <div className={chipClassName}>
            <button
                type="button"
                className="flex min-w-0 items-center gap-2"
                onClick={onClick}
            >
                <FilterChipIcon icon={chip.icon} />
                <span className="truncate">{chip.label}</span>
            </button>

            {onRemove && (
                <button
                    type="button"
                    className={cn(
                        "-mr-1 flex h-5 w-5 items-center justify-center rounded-full",
                        "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    )}
                    onClick={onRemove}
                    aria-label={`Remove ${chip.label}`}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    )
}
