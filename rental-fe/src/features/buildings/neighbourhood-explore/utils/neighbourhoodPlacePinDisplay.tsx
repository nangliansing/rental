import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Bus,
  Coffee,
  Dumbbell,
  Hospital,
  Pill,
  Ship,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Store,
  TrainFront,
  UtensilsCrossed,
} from "lucide-react"

import type { NeighbourhoodCategoryKey } from "../../api/getBuildingNeighbourhood"

export type NeighbourhoodPinDisplay = {
  color: string
  Icon: LucideIcon
}

export const BUILDING_PIN_DISPLAY: NeighbourhoodPinDisplay = {
  color: "#DC2626",
  Icon: Building2,
}

export const PUBLIC_TRANSPORT_PIN_COLOR = "#2563EB"
export const PUBLIC_TRANSPORT_RAIL_PIN_COLOR = "#2563EB"
export const PUBLIC_TRANSPORT_BUS_PIN_COLOR = "#C2410C"
export const PUBLIC_TRANSPORT_FERRY_PIN_COLOR = "#0891B2"

const CATEGORY_PIN_DISPLAY: Record<
  NeighbourhoodCategoryKey,
  NeighbourhoodPinDisplay
> = {
  public_transport: {
    color: PUBLIC_TRANSPORT_RAIL_PIN_COLOR,
    Icon: TrainFront,
  },
  convenience: {
    color: "#D97706",
    Icon: Store,
  },
  supermarket: {
    color: "#059669",
    Icon: ShoppingCart,
  },
  restaurant: {
    color: "#EA580C",
    Icon: UtensilsCrossed,
  },
  cafe: {
    color: "#92400E",
    Icon: Coffee,
  },
  pharmacy: {
    color: "#16A34A",
    Icon: Pill,
  },
  market: {
    color: "#CA8A04",
    Icon: ShoppingBasket,
  },
  shopping_mall: {
    color: "#7C3AED",
    Icon: ShoppingBag,
  },
  gym: {
    color: "#DB2777",
    Icon: Dumbbell,
  },
  hospital: {
    color: "#BE123C",
    Icon: Hospital,
  },
}

export function getPublicTransportPinDisplay(
  mode?: string,
): NeighbourhoodPinDisplay {
  switch (mode?.toLowerCase()) {
    case "bus":
      return {
        color: PUBLIC_TRANSPORT_BUS_PIN_COLOR,
        Icon: Bus,
      }
    case "ferry":
      return {
        color: PUBLIC_TRANSPORT_FERRY_PIN_COLOR,
        Icon: Ship,
      }
    default:
      return {
        color: PUBLIC_TRANSPORT_RAIL_PIN_COLOR,
        Icon: TrainFront,
      }
  }
}

export function getNeighbourhoodPlacePinDisplay(
  category: NeighbourhoodCategoryKey,
  mode?: string,
): NeighbourhoodPinDisplay {
  if (category === "public_transport") {
    return getPublicTransportPinDisplay(mode)
  }

  return CATEGORY_PIN_DISPLAY[category]
}
