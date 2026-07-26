export const NEIGHBOURHOOD_DEFAULT_RADIUS_METERS = 1000
export const NEIGHBOURHOOD_FETCH_RADIUS_METERS = 2000

export const NEIGHBOURHOOD_RADIUS_OPTIONS = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 1500, label: "1.5 km" },
  { value: 2000, label: "2 km" },
] as const

export type NeighbourhoodRadiusMeters =
  (typeof NEIGHBOURHOOD_RADIUS_OPTIONS)[number]["value"]

export const NEIGHBOURHOOD_ALL_CATEGORY_KEY = "all" as const
