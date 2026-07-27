import type { APIProviderProps } from "@vis.gl/react-google-maps"

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ""

export const GOOGLE_MAPS_MAP_ID =
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"

export const GOOGLE_MAPS_LIBRARIES = ["places"] as const

export const MAP_SEARCH_MAP_INSTANCE_ID = "map-search"
export const NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID = "neighbourhood-explore"

export const GOOGLE_MAPS_API_PROVIDER_PROPS = {
  apiKey: GOOGLE_MAPS_API_KEY,
  libraries: [...GOOGLE_MAPS_LIBRARIES],
  authReferrerPolicy: "origin",
} satisfies Pick<
  APIProviderProps,
  "apiKey" | "libraries" | "authReferrerPolicy"
>

export function shouldUseClientMapStyles(mapId: string = GOOGLE_MAPS_MAP_ID) {
  return !mapId || mapId === "DEMO_MAP_ID"
}

export function hasGoogleMapsApiKey(apiKey: string = GOOGLE_MAPS_API_KEY) {
  return Boolean(apiKey)
}
