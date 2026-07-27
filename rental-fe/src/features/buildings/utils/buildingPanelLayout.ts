import { cn } from "@/lib/utils"

export const BUILDING_PANEL_GUTTER_COLOR_CLASS = "bg-[#f1f3f4]"
export const BUILDING_PANEL_CONTENT_INSET_CLASS = "px-4"
export const BUILDING_PANEL_INSET_BREAKOUT_CLASS = "-mx-4"
export const BUILDING_PANEL_GUTTER_PADDING_CLASS = "py-2"

export const BUILDING_PANEL_SURFACE_CLASS = cn(
  "bg-white",
  BUILDING_PANEL_CONTENT_INSET_CLASS,
  "py-4",
)

export const BUILDING_PANEL_BREAKOUTS = ["inset", "flush"] as const
export type BuildingPanelBreakout = (typeof BUILDING_PANEL_BREAKOUTS)[number]

export function normalizeBuildingPanelBreakout(
  breakout?: unknown,
): BuildingPanelBreakout {
  return breakout === "flush" ? "flush" : "inset"
}

export function getBuildingPanelContainerClass(
  breakout: BuildingPanelBreakout | unknown = "inset",
  className?: string,
) {
  const normalizedBreakout = normalizeBuildingPanelBreakout(breakout)

  return cn(
    BUILDING_PANEL_GUTTER_COLOR_CLASS,
    BUILDING_PANEL_GUTTER_PADDING_CLASS,
    normalizedBreakout === "inset" && BUILDING_PANEL_INSET_BREAKOUT_CLASS,
    className,
  )
}

export function getBuildingPanelSurfaceClass(className?: string) {
  return cn(BUILDING_PANEL_SURFACE_CLASS, className)
}
