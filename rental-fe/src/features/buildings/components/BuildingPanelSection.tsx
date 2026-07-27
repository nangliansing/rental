import type React from "react"

import {
  getBuildingPanelContainerClass,
  getBuildingPanelSurfaceClass,
  normalizeBuildingPanelBreakout,
  type BuildingPanelBreakout,
} from "../utils/buildingPanelLayout"

type BuildingPanelSectionProps = {
  children: React.ReactNode
  breakout?: BuildingPanelBreakout
  className?: string
  surfaceClassName?: string
}

export function BuildingPanelSection({
  children,
  breakout = "inset",
  className,
  surfaceClassName,
}: BuildingPanelSectionProps) {
  const normalizedBreakout = normalizeBuildingPanelBreakout(breakout)

  return (
    <div
      className={getBuildingPanelContainerClass(normalizedBreakout, className)}
    >
      <div className={getBuildingPanelSurfaceClass(surfaceClassName)}>
        {children}
      </div>
    </div>
  )
}
