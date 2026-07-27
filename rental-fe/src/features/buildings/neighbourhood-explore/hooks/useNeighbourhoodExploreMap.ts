import { useMap } from "@vis.gl/react-google-maps"

import { NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID } from "@/shared/google-maps/googleMapsConfig"

export function useNeighbourhoodExploreMap() {
  return useMap(NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID)
}
