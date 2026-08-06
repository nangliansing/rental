import { useMediaQuery } from "@/hooks/useMediaQuery"

import { ExploreOpportunitiesDesktopBody } from "./layout/ExploreOpportunitiesDesktopBody"
import { ExploreOpportunitiesMobileBody } from "./layout/ExploreOpportunitiesMobileBody"

export function ExploreOpportunitiesPanelBody() {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return isDesktop ? (
    <ExploreOpportunitiesDesktopBody />
  ) : (
    <ExploreOpportunitiesMobileBody />
  )
}
