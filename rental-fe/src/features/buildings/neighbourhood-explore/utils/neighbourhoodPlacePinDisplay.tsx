import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Coffee,
  Dumbbell,
  Hospital,
  Pill,
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

const CATEGORY_PIN_DISPLAY: Record<
  NeighbourhoodCategoryKey,
  NeighbourhoodPinDisplay
> = {
  public_transport: {
    color: "#2563EB",
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

export function getNeighbourhoodPlacePinDisplay(
  category: NeighbourhoodCategoryKey,
): NeighbourhoodPinDisplay {
  return CATEGORY_PIN_DISPLAY[category]
}
