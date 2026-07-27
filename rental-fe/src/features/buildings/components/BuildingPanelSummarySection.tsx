import type { ComponentProps } from "react"

import { BuildingPanelSection } from "./BuildingPanelSection"
import { BuildingSummaryCard } from "./BuildingSummaryCard"
import type { BuildingSummaryData } from "../utils/buildingSummaryDisplay"
import type { BuildingPanelBreakout } from "../utils/buildingPanelLayout"

type BuildingSummaryCardProps = ComponentProps<typeof BuildingSummaryCard>

type BuildingPanelSummarySectionProps = Omit<
  BuildingSummaryCardProps,
  "variant" | "building"
> & {
  building?: BuildingSummaryData | null
  breakout?: BuildingPanelBreakout
  sectionClassName?: string
  surfaceClassName?: string
}

export function BuildingPanelSummarySection({
  building,
  breakout = "inset",
  sectionClassName,
  surfaceClassName,
  ...summaryProps
}: BuildingPanelSummarySectionProps) {
  if (!building) {
    return null
  }

  return (
    <BuildingPanelSection
      breakout={breakout}
      className={sectionClassName}
      surfaceClassName={surfaceClassName}
    >
      <BuildingSummaryCard
        building={building}
        variant="embedded"
        {...summaryProps}
      />
    </BuildingPanelSection>
  )
}
