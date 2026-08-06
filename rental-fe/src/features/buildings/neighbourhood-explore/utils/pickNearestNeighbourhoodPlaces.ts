import type {
  NeighbourhoodCategoryKey,
  NeighbourhoodPlace,
} from "../../api/getBuildingNeighbourhood"

export type NearbyPlaceGroupId =
  | "rail"
  | "bus"
  | "ferry"
  | "cafe"
  | "restaurant"
  | "shopping_mall"
  | "market"
  | "convenience"
  | "supermarket"
  | "pharmacy"
  | "gym"
  | "hospital"

export type NearestNearbyPlace = {
  groupId: NearbyPlaceGroupId
  groupLabel: string
  place: NeighbourhoodPlace
}

type NearbyPlaceGroup = {
  id: NearbyPlaceGroupId
  label: string
  matches: (place: NeighbourhoodPlace) => boolean
}

const RAIL_MODES = new Set([
  "mrt",
  "bts",
  "arl",
  "srt",
  "rail",
  "train",
  "subway",
  "metro",
  "tram",
])

function normalizeMode(mode: unknown) {
  return typeof mode === "string" ? mode.trim().toLowerCase() : ""
}

function isPublicTransport(place: NeighbourhoodPlace) {
  return place.category === "public_transport"
}

function isCategory(
  place: NeighbourhoodPlace,
  category: NeighbourhoodCategoryKey,
) {
  return place.category === category
}

/** Stable display order. Each place matches at most one group. */
const NEARBY_PLACE_GROUPS: readonly NearbyPlaceGroup[] = [
  {
    id: "rail",
    label: "MRT / BTS",
    matches: (place) => {
      if (!isPublicTransport(place)) return false
      const mode = normalizeMode(place.mode)
      return !mode || RAIL_MODES.has(mode)
    },
  },
  {
    id: "bus",
    label: "Bus",
    matches: (place) => isPublicTransport(place) && normalizeMode(place.mode) === "bus",
  },
  {
    id: "ferry",
    label: "Ferry",
    matches: (place) =>
      isPublicTransport(place) && normalizeMode(place.mode) === "ferry",
  },
  {
    id: "cafe",
    label: "Cafe",
    matches: (place) => isCategory(place, "cafe"),
  },
  {
    id: "restaurant",
    label: "Restaurant",
    matches: (place) => isCategory(place, "restaurant"),
  },
  {
    id: "shopping_mall",
    label: "Mall",
    matches: (place) => isCategory(place, "shopping_mall"),
  },
  {
    id: "market",
    label: "Market",
    matches: (place) => isCategory(place, "market"),
  },
  {
    id: "convenience",
    label: "Convenience",
    matches: (place) => isCategory(place, "convenience"),
  },
  {
    id: "supermarket",
    label: "Supermarket",
    matches: (place) => isCategory(place, "supermarket"),
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    matches: (place) => isCategory(place, "pharmacy"),
  },
  {
    id: "gym",
    label: "Gym",
    matches: (place) => isCategory(place, "gym"),
  },
  {
    id: "hospital",
    label: "Hospital",
    matches: (place) => isCategory(place, "hospital"),
  },
]

function isUsablePlace(value: unknown): value is NeighbourhoodPlace {
  if (!value || typeof value !== "object") return false

  const place = value as Partial<NeighbourhoodPlace>
  return (
    typeof place.id === "string" &&
    place.id.trim().length > 0 &&
    typeof place.name === "string" &&
    place.name.trim().length > 0 &&
    typeof place.category === "string" &&
    typeof place.distanceMeters === "number" &&
    Number.isFinite(place.distanceMeters) &&
    place.distanceMeters >= 0
  )
}

/**
 * One-pass nearest place per display group.
 * Invalid input / places are ignored. Output is a small ordered list.
 */
export function pickNearestNeighbourhoodPlaces(
  places: unknown,
): NearestNearbyPlace[] {
  if (!Array.isArray(places) || places.length === 0) return []

  const bestByGroup = new Map<NearbyPlaceGroupId, NearestNearbyPlace>()

  for (const item of places) {
    if (!isUsablePlace(item)) continue

    for (const group of NEARBY_PLACE_GROUPS) {
      if (!group.matches(item)) continue

      const current = bestByGroup.get(group.id)
      if (
        !current ||
        item.distanceMeters < current.place.distanceMeters
      ) {
        bestByGroup.set(group.id, {
          groupId: group.id,
          groupLabel: group.label,
          place: item,
        })
      }
      break
    }
  }

  if (bestByGroup.size === 0) return []

  const nearest: NearestNearbyPlace[] = []
  for (const group of NEARBY_PLACE_GROUPS) {
    const hit = bestByGroup.get(group.id)
    if (hit) nearest.push(hit)
  }

  return nearest
}
