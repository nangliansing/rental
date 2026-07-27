import { useMap } from "@vis.gl/react-google-maps"

import { MAP_SEARCH_MAP_INSTANCE_ID } from "@/shared/google-maps/googleMapsConfig"

export function useMapSearchMap() {
  return useMap(MAP_SEARCH_MAP_INSTANCE_ID)
}
