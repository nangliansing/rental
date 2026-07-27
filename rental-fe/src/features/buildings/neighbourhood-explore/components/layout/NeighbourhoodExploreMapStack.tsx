import { NeighbourhoodExploreAttribution } from "../NeighbourhoodExploreAttribution"
import { NeighbourhoodExploreCategoryBar } from "../NeighbourhoodExploreCategoryBar"
import { NeighbourhoodExploreMap } from "../map/NeighbourhoodExploreMap"

export function NeighbourhoodExploreMapStack() {
  return (
    <>
      <NeighbourhoodExploreCategoryBar />
      <NeighbourhoodExploreMap />
      <NeighbourhoodExploreAttribution variant="overlay" />
    </>
  )
}
