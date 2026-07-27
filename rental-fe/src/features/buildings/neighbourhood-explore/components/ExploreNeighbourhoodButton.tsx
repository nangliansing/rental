import { Compass } from "lucide-react"
import type { MouseEvent } from "react"

import { cn } from "@/lib/utils"

import {
  EXPLORE_FOOTER_BUTTON_CLASSNAME,
  EXPLORE_FOOTER_ICON_CLASSNAME,
} from "@/features/contacts/utils/contactPresentation"
import {
  BUILDING_AMENITY_RAIL_ACTION_BUTTON_CLASS,
  BUILDING_AMENITY_RAIL_ACTION_ICON_SURFACE_CLASS,
  BUILDING_AMENITY_RAIL_ACTION_LABEL_CLASS,
  BUILDING_AMENITY_RAIL_ICON_CLASS,
} from "../../utils/buildingAmenityRailLayout"

export const EXPLORE_NEIGHBOURHOOD_BUTTON_LABEL = "Explore neighbourhood"

type ExploreNeighbourhoodButtonProps = {
  variant?: "footer" | "pill" | "rail"
  isOpen?: boolean
  onClick: (trigger: HTMLButtonElement) => void
}

function getExploreDialogButtonProps(isOpen: boolean) {
  return {
    "aria-label": EXPLORE_NEIGHBOURHOOD_BUTTON_LABEL,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": isOpen,
  }
}

function handleExploreButtonClick(
  onClick: (trigger: HTMLButtonElement) => void,
  event: MouseEvent<HTMLButtonElement>,
) {
  onClick(event.currentTarget)
}

export function ExploreNeighbourhoodButton({
  variant = "pill",
  isOpen = false,
  onClick,
}: ExploreNeighbourhoodButtonProps) {
  const dialogButtonProps = getExploreDialogButtonProps(isOpen)

  if (variant === "footer") {
    return (
      <button
        type="button"
        className={cn(
          EXPLORE_FOOTER_BUTTON_CLASSNAME,
          isOpen && "border-slate-300 bg-slate-50",
        )}
        {...dialogButtonProps}
        onClick={(event) => handleExploreButtonClick(onClick, event)}
      >
        <Compass
          aria-hidden="true"
          className={EXPLORE_FOOTER_ICON_CLASSNAME}
          strokeWidth={2}
        />
        Explore
      </button>
    )
  }

  if (variant === "rail") {
    return (
      <button
        type="button"
        className={BUILDING_AMENITY_RAIL_ACTION_BUTTON_CLASS}
        {...dialogButtonProps}
        onClick={(event) => handleExploreButtonClick(onClick, event)}
      >
        <span
          className={cn(
            BUILDING_AMENITY_RAIL_ACTION_ICON_SURFACE_CLASS,
            isOpen && "ring-2 ring-slate-950/15 ring-offset-2",
          )}
        >
          <Compass
            aria-hidden="true"
            className={BUILDING_AMENITY_RAIL_ICON_CLASS}
            strokeWidth={2}
          />
        </span>
        <span className={BUILDING_AMENITY_RAIL_ACTION_LABEL_CLASS}>
          Explore
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
      )}
      {...dialogButtonProps}
      onClick={(event) => handleExploreButtonClick(onClick, event)}
    >
      <Compass className="h-3.5 w-3.5" aria-hidden="true" />
      Explore
    </button>
  )
}
